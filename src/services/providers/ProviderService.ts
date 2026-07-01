import { ProviderRegistry } from '@/services/providers/ProviderRegistry.js'

/**
 * Public API for managing providers.
 */
export class ProviderService {
    readonly #registry: ProviderRegistry

    constructor(registry: ProviderRegistry) {
        this.#registry = registry
    }

    /**
     * Register a provider into the registry.
     */
    register(provider: Readonly<Parameters<ProviderRegistry['add']>[0]>): void {
        this.#registry.add(provider)
    }

    /**
     * Get all providers for a namespace.
     * @param ns - Namespace to get providers for.
     */
    getByNamespace(ns: Readonly<Parameters<ProviderRegistry['getByNamespace']>[0]>): Readonly<ReturnType<ProviderRegistry['getByNamespace']>> {
        return this.#registry.getByNamespace(ns)
    }
}
