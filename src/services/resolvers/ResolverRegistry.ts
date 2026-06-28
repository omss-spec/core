import type { OMSSResolver, UnknownResolverType } from '@/types/resolver.js'

/**
 * Registry responsible for storing OMSS resolvers, grouped by namespace.
 */
export class ResolverRegistry {
    /**
     * Map of namespace and resolvers that handle that namespace. 
    */
    readonly #resolversByNamespace = new Map<string, OMSSResolver<unknown>[]>()

    /**
     * Register a resolver for its namespace.
     *
     * Multiple resolvers per namespace are allowed for extensibility.
     */
    add(resolver: UnknownResolverType): void {
        const ns = resolver.namespace

        if (!/^[A-Za-z0-9-]+$/.test(ns)) {
            throw new Error(
                'Resolver.namespace must be a non-empty string containing only letters, numbers, and/or hyphens'
            )
        }

        const existing = this.#resolversByNamespace.get(ns) ?? []

        // Avoid duplicate registration of the same resolver instance.
        if (existing.includes(resolver)) {
            throw new Error(`Resolver ("${resolver.name ?? '<anonymous>'}" is already registered for namespace "${ns}"`)
        }

        this.#resolversByNamespace.set(ns, [...existing, resolver])
    }

    /**
     * Get all resolvers for a namespace.
     */
    getByNamespace(namespace: string): Readonly<OMSSResolver<unknown>[]> {
        return this.#resolversByNamespace.get(namespace) ?? []
    }

    /**
     * Get all registered resolvers.
     */
    getAll(): Readonly<OMSSResolver<unknown>[]> {
        const result: OMSSResolver<unknown>[] = []

        for (const resolvers of this.#resolversByNamespace.values()) {
            result.push(...resolvers)
        }

        return result
    }
}
