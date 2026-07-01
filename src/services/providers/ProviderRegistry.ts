import { OMSSProviderError } from '@/utils/error.js'
import { UnknownProvider } from '@/types/provider.js'
import { NAMESPACE_REGEX } from '@/services/resolvers/public-api.js'

/**
 * Registry responsible for storing OMSS providers and exposing query helpers.
 */
export class ProviderRegistry {
    /**
     * Providers keyed by their unique id.
     */
    readonly #providers = new Map<string, UnknownProvider>()

    /**
     * Register a provider
     * @param provider - Provider instance to register.
     */
    add(provider: UnknownProvider): void {
        if (provider.id.trim().length === 0) {
            throw new OMSSProviderError('Provider.id must be a non-empty string', { cause: provider })
        }

        if (provider.resolvers.length === 0) {
            throw new OMSSProviderError('Provider must have at least one resolver registered', { cause: provider })
        }

        if (this.#providers.has(provider.id)) {
            throw new Error(`Provider "${provider.id}" is already registered`, { cause: provider })
        }

        this.#providers.set(provider.id, provider)
    }

    /**
     * Filter providers by namespace.
     * @param ns - Namespace to filter by.
     */
    getByNamespace(ns: string) {
        if (!NAMESPACE_REGEX.test(ns)) {
            throw new OMSSProviderError('Provider.namespace must be a non-empty string containing only letters, numbers, and/or hyphens', {
                cause: ns,
            })
        }

        return Array.from(this.#providers.values()).filter((p) => p.resolvers.some((r) => r.namespace === ns))
    }
}
