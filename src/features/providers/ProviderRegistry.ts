import type { UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR, OK, validateSafeUniqueString } from '@/utils/utils.js'
import { Result } from '@/types/utils.js'

/**
 * Registry responsible for storing and managing OMSS Providers.
 *
 * Providers are stored by their unique {@link UnknownProvider.id}.
 * This registry does not know about hooks.
 */
export class ProviderRegistry {
    /**
     * Internal map of registered providers, keyed by provider ID.
     */
    readonly #providers = new Map<string, UnknownProvider>()

    /**
     * Adds a provider to the registry.
     *
     * @param provider - The provider instance to register.
     * @returns `OK` if registration succeeded, `ERR` if the provider ID is already taken.
     */
    add(provider: UnknownProvider): Result<UnknownProvider, OMSSProviderError> {
        if (this.#providers.has(provider.id)) {
            return ERR(new OMSSProviderError(`Provider "${provider.id}" is already registered`))
        }

        const valProvIdReq = validateSafeUniqueString(provider.id, 'provider ID', OMSSProviderError)
        if (!valProvIdReq.ok) {
            return ERR(valProvIdReq.error)
        }

        const valResolverNamespaceReq = validateSafeUniqueString(provider.resolver.namespace, 'resolver namespace for resolver with name: "' + provider.resolver.name + '" and id:', OMSSProviderError)
        if (!valResolverNamespaceReq.ok) {
            return ERR(valResolverNamespaceReq.error)
        }

        this.#providers.set(provider.id, provider)
        return OK(provider)
    }

    /**
     * Retrieves a registered provider by its ID.
     *
     * @param id - The unique provider ID.
     * @returns The provider instance, or `undefined` if not found.
     */
    get(id: string): UnknownProvider | undefined {
        return this.#providers.get(id)
    }

    /**
     * Returns all registered providers.
     */
    getAll(filter?: (p: UnknownProvider) => boolean): UnknownProvider[] {
        if (filter) {
            return [...this.#providers.values()].filter(filter)
        }
        return [...this.#providers.values()]
    }

    /**
     * Returns whether a provider with the given ID is registered.
     *
     * @param id - The unique provider ID.
     */
    has(id: string): boolean {
        return this.#providers.has(id)
    }
}
