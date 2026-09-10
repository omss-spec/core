import type { ProviderServiceMiddleware, ProviderServiceOperations, UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR, OK } from '@/utils/utils.js'
import { type ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { type HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { Result } from '@/types/utils.js'
import type { OMSSHooks } from '@/types/hooks.js'
import { createMiddlewareRunner } from '@/utils/MiddlewareRunner.js'

/**
 * The public API for managing OMSS Providers.
 */
export interface ProviderService {
    /**
     * Adds middleware to the `register` pipeline.
     * Middlewares run in insertion order, after hooks and before the
     * actual registry `add()` call.
     */
    use<TMethod extends keyof ProviderServiceOperations>(method: TMethod, handler: ProviderServiceMiddleware<TMethod>): ProviderService

    /**
     * Registers a provider into the system.
     */
    register(provider: UnknownProvider): Promise<Result<UnknownProvider, OMSSProviderError>>

    /**
     * Retrieves a registered provider by its ID.
     *
     * @param id - The provider ID to look up.
     * @returns The provider instance, or `undefined` if not found.
     */
    get(id: string): ReturnType<ProviderRegistry['get']>

    /**
     * Returns all registered providers.
     * @param filter - Optional filter function to apply to providers.
     */
    getAll(filter?: (p: UnknownProvider) => boolean): ReturnType<ProviderRegistry['getAll']>

    /**
     * Returns whether a provider with the given ID has been registered.
     *
     * @param id - The provider ID to check.
     */
    has(id: string): ReturnType<ProviderRegistry['has']>

    /**
     * Returns a map of all namespaces and an array of all known identifiers for each namespace.
     * This list is BEST EFFORT ONLY. Do not rely on this. If any provider returns a `*` automatically, the namespace will support all identifiers (e.g. `"tmdb": ["*"], "imdb": ["tt37636", "..."]`.
     */
    catalog(): Promise<Result<Map<string, string[]>, OMSSProviderError>>

    /**
     * Returns the catalog for a single namespace.
     * Returns `undefined` if no provider in that namespace exposes a catalog.
     *
     * @param namespace - The resolver namespace to look up (e.g. `"tmdb"`).
     * @returns Merged list of IDs for the namespace, `["*"]` if any provider
     *          signals wildcard support, or `undefined` if no catalog data exists.
     *
     * @remarks
     * Re-invokes `catalog()` on every matching provider on each call — see
     * {@link ProviderService.catalog} for caching implications.
     */
    catalogForNamespace(namespace: string): Promise<Result<string[], OMSSProviderError>>
}

/**
 * Creates a new {@link ProviderService}.
 *
 * @param providerRegistry - The provider registry to wrap.
 * @param hookRegistry - The hook registry used to dispatch provider lifecycle hooks.
 */
export function createProviderService(providerRegistry: ProviderRegistry, hookRegistry: HookRegistry<OMSSHooks>): ProviderService {
    const middleware = createMiddlewareRunner<ProviderServiceOperations>()
    let insideBeforeProviderRegister = false

    const service: ProviderService = {
        use(method, handler) {
            middleware.use(method, handler)
            return service
        },

        async register(provider) {
            if (insideBeforeProviderRegister) {
                return ERR(new OMSSProviderError('Providers cannot be registered during beforeProviderRegister'))
            }

            insideBeforeProviderRegister = true
            try {
                await hookRegistry.run('beforeProviderRegister', { provider })
            } finally {
                insideBeforeProviderRegister = false
            }

            const result = await middleware.run('register', { provider }, () => providerRegistry.add(provider))

            if (!result.ok) {
                await hookRegistry.run('providerRegisterFailed', {
                    provider,
                    error: result.error,
                })
                return ERR(result.error)
            }

            await hookRegistry.run('afterProviderRegister', { provider })
            return result
        },

        get(id) {
            return providerRegistry.get(id)
        },

        getAll(filter) {
            return providerRegistry.getAll(filter)
        },

        has(id) {
            return providerRegistry.has(id)
        },

        async catalog() {
            const allProviders = service.getAll()
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
        },

        async catalogForNamespace(namespace) {
            const providers = service.getAll((p) => p.resolver.namespace === namespace)
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

            return result.length > 0 ? OK(result) : ERR(new OMSSProviderError(`No catalog data available for namespace "${namespace}"`))
        },
    }

    return service
}
