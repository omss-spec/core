import type { UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR, OK, validateSafeUniqueString } from '@/utils/utils.js'
import { Result } from '@/types/utils.js'
import { CATALOG_ENTRY } from '@/utils/regexp.js'

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
    async add(provider: UnknownProvider): Promise<Result<UnknownProvider, OMSSProviderError>> {
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

        if (this.getAll().some((p) => p.resolver.namespace === provider.resolver.namespace && p.resolver !== provider.resolver)) {
            return ERR(new OMSSProviderError(`Resolver namespace "${provider.resolver.namespace}" is already registered by another provider and another resolver. Use one resolver per namespace.`))
        }

        if (provider.catalog) {
            const entries = await provider.catalog()
            const hasWildcard = entries.includes('*')
            const hasOther = entries.some((id) => id !== '*')

            if (hasWildcard && hasOther) {
                return ERR(new OMSSProviderError(`Provider "${provider.id}" catalog contains "*" mixed with other IDs. Use either a single "*" or a list of valid IDs.`))
            }

            for (const id of entries) {
                if (!CATALOG_ENTRY.test(id)) {
                    return ERR(new OMSSProviderError(`Provider "${provider.id}" catalog contains an invalid entry "${id}". Entries must be non-empty strings with no whitespace, or "*".`))
                }
            }
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
