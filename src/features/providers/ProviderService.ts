import type { RegisterMiddleware, UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR } from '@/utils/utils.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { Result } from '@/types/utils.js'

/**
 * The public API for managing OMSS Providers.
 */
export class ProviderService {
    readonly #providerRegistry: ProviderRegistry
    readonly #hookRegistry: HookRegistry
    readonly #registerMiddlewares: RegisterMiddleware[] = []
    #insideBeforeProviderRegister = false

    constructor(providerRegistry: ProviderRegistry, hookRegistry: HookRegistry) {
        this.#providerRegistry = providerRegistry
        this.#hookRegistry = hookRegistry
    }
    /**
     * Adds middleware to the `register` pipeline.
     * Middlewares run in insertion order, after hooks and before the
     * actual registry `add()` call.
     */
    use(middleware: RegisterMiddleware): this {
        this.#registerMiddlewares.push(middleware)
        return this
    }

    /**
     * Registers a provider into the system.
     */
    async register(provider: UnknownProvider): Promise<Result<UnknownProvider, OMSSProviderError>> {
        if (this.#insideBeforeProviderRegister) {
            return ERR(new OMSSProviderError('Providers cannot be registered during beforeProviderRegister'))
        }

        this.#insideBeforeProviderRegister = true
        try {
            await this.#hookRegistry.run('beforeProviderRegister', { provider })
        } finally {
            this.#insideBeforeProviderRegister = false
        }

        // Build the middleware chain; innermost is the actual registry added
        const chain = this.#buildMiddlewareChain(provider)
        const result = await chain()

        if (!result.ok) {
            await this.#hookRegistry.run('providerRegisterFailed', {
                provider,
                error: result.error,
            })
            return ERR(result.error)
        }

        await this.#hookRegistry.run('afterProviderRegister', { provider })
        return result
    }

    /**
     * Retrieves a registered provider by its ID.
     *
     * @param id - The provider ID to look up.
     * @returns The provider instance, or `undefined` if not found.
     */
    get(id: string): ReturnType<ProviderRegistry['get']> {
        return this.#providerRegistry.get(id)
    }

    /**
     * Returns all registered providers.
     */
    getAll(): ReturnType<ProviderRegistry['getAll']> {
        return this.#providerRegistry.getAll()
    }

    /**
     * Returns whether a provider with the given ID has been registered.
     *
     * @param id - The provider ID to check.
     */
    has(id: string): ReturnType<ProviderRegistry['has']> {
        return this.#providerRegistry.has(id)
    }

    /**
     * Composes the middleware array into a single callable chain.
     * The terminal function calls `this.#providerRegistry.add()`.
     */
    #buildMiddlewareChain(provider: UnknownProvider): () => Promise<Result<UnknownProvider, OMSSProviderError>> {
        const terminal = async () => this.#providerRegistry.add(provider)

        return this.#registerMiddlewares.reduceRight<() => Promise<Result<UnknownProvider, OMSSProviderError>>>((next, middleware) => () => middleware(provider, next), terminal)
    }
}
