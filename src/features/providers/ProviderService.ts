import type { UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR } from '@/utils/utils.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { Result } from '@/types/utils.js'

/**
 * The public API for managing OMSS Providers.
 */
export class ProviderService {
    readonly #providerRegistry: ProviderRegistry
    readonly #hookRegistry: HookRegistry
    #insideBeforeProviderRegister = false

    constructor(providerRegistry: ProviderRegistry, hookRegistry: HookRegistry) {
        this.#providerRegistry = providerRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Registers a provider into the system.
     *
     * @param provider - The provider instance to register.
     * @returns `OK` with the registered provider, or `ERR` with an {@link OMSSProviderError}.
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

        const result = this.#providerRegistry.add(provider)

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
}
