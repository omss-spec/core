import type { ProviderServiceMiddleware, ProviderServiceOperations, UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR, OK } from '@/utils/utils.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { Result } from '@/types/utils.js'
import type { OMSSHooks, ProviderHooks } from '@/types/hooks.js'
import { HookService } from '@/features/hooks/HookService.js'
import { MiddlewareRunner } from '@/utils/middleware.js'

/**
 * The public API for managing OMSS Providers.
 */
export class ProviderService {
    readonly hooks: HookService<ProviderHooks>
    readonly #providerRegistry: ProviderRegistry
    readonly #hookRegistry: HookRegistry<OMSSHooks>
    readonly #middleware = new MiddlewareRunner<ProviderServiceOperations>()
    #insideBeforeProviderRegister = false

    constructor(providerRegistry: ProviderRegistry, hookRegistry: HookRegistry<OMSSHooks>, providerHookRegistry: HookRegistry<ProviderHooks>) {
        this.#providerRegistry = providerRegistry
        this.#hookRegistry = hookRegistry
        this.hooks = new HookService<ProviderHooks>(providerHookRegistry)
    }

    /**
     * Adds middleware to the `register` pipeline.
     * Middlewares run in insertion order, after hooks and before the
     * actual registry `add()` call.
     */
    use<TMethod extends keyof ProviderServiceOperations>(method: TMethod, handler: ProviderServiceMiddleware<TMethod>): this {
        this.#middleware.use(method, handler)
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

        const result = await this.#middleware.run('register', { provider }, () => this.#providerRegistry.add(provider))

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
     * @param filter - Optional filter function to apply to providers.
     */
    getAll(filter?: (p: UnknownProvider) => boolean): ReturnType<ProviderRegistry['getAll']> {
        return this.#providerRegistry.getAll(filter)
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
     * Returns a map of all namespaces and an array of all known identifiers for each namespace.
     * This list is BEST EFFORT ONLY. Do not rely on this. If any provider returns a `*` automatically, the namespace will support all identifiers (e.g. `"tmdb": ["*"], "imdb": ["tt37636", "..."]`.
     */
    async catalog(): Promise<Result<Map<string, string[]>, OMSSProviderError>> {
        const allProviders = this.getAll()
        const result = new Map<string, string[]>()

        await Promise.all(
            allProviders.map(async (provider) => {
                if (!provider.catalog) return

                const namespace = provider.resolver.namespace
                const entries = await provider.catalog()

                // If namespace already collapsed to wildcard, skip.
                if (result.get(namespace)?.[0] === '*') return

                if (entries.includes('*')) {
                    // Any single wildcard provider collapses the whole namespace.
                    result.set(namespace, ['*'])
                    return
                }

                // Merge deduplicated IDs into the namespace bucket.
                const existing = result.get(namespace) ?? []
                const merged = Array.from(new Set([...existing, ...entries]))
                result.set(namespace, merged)
            })
        )

        return OK(result)
    }

    /**
     * Returns the catalog for a single namespace.
     * Returns `undefined` if no provider in that namespace exposes a catalog.
     *
     * @param namespace - The resolver namespace to look up (e.g. `"tmdb"`).
     * @returns Merged list of IDs for the namespace, `["*"]` if any provider
     *          signals wildcard support, or `undefined` if no catalog data exists.
     */
    async catalogForNamespace(namespace: string): Promise<Result<string[] | undefined, OMSSProviderError>> {
        const providers = this.getAll((p) => p.resolver.namespace === namespace)
        if (providers.length === 0) return ERR(new OMSSProviderError(`No providers registered for namespace "${namespace}"`))

        const result: string[] = []

        for (const provider of providers) {
            if (!provider.catalog) continue

            const entries = await provider.catalog()

            if (entries.includes('*')) {
                return OK(['*'])
            }

            for (const id of entries) {
                if (!result.includes(id)) {
                    result.push(id)
                }
            }
        }

        return result.length > 0 ? OK(result) : OK(undefined)
    }
}
