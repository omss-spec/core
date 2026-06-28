import { ResolverRegistry } from '@/services/resolvers/ResolverRegistry.js'
import { HookRegistry } from '@/services/hooks/HookRegistry.js'

/**
 * Public API for managing and executing resolvers.
 */
export class ResolverService {
    readonly #resolverRegistry: ResolverRegistry
    readonly #hooksRegistry: HookRegistry
    #insideOnResolverRegister = false

    constructor(resolverRegistry: ResolverRegistry, hooksRegistry: HookRegistry) {
        this.#resolverRegistry = resolverRegistry
        this.#hooksRegistry = hooksRegistry
    }

    /**
     * Register a resolver into the system.
     */
    async register(resolver: Parameters<ResolverRegistry['add']>[0]): Promise<void> {
        if (this.#insideOnResolverRegister) {
            throw new Error('Resolvers cannot be registered during onResolverRegister')
        }

        this.#insideOnResolverRegister = true
        try {
            await this.#hooksRegistry.run('onResolverRegister', { resolver })
        } finally {
            this.#insideOnResolverRegister = false
        }

        this.#resolverRegistry.add(resolver)
    }

    getByNamespace(ns: Readonly<Parameters<ResolverRegistry['getByNamespace']>[0]>): Readonly<ReturnType<ResolverRegistry['getByNamespace']>> {
        return this.#resolverRegistry.getByNamespace(ns)
    }
}
