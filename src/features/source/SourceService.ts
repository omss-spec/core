import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import OMSSServer from '@/core/server.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { OMSSProviderResults, ProviderResult, UnknownProvider } from '@/types/provider.js'
import { OMSSId, ResolverExecutionContext } from '@/types/resolver.js'
import { parseOMSSId } from '@/features/resolvers/utils.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR, OK } from '@/utils/utils.js'
import { Result } from '@/types/utils.js'

/**
 * The public API for resolving sources for media.
 */
export class SourceService {
    readonly #providerRegistry: ProviderRegistry
    readonly #hookRegistry: HookRegistry
    readonly #omssServer: OMSSServer

    constructor(omssServer: OMSSServer, providerRegistry: ProviderRegistry, hookRegistry: HookRegistry) {
        this.#omssServer = omssServer
        this.#providerRegistry = providerRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Fetches and aggregates sources from all matching providers/resolvers for an OMSS id.
     *
     * @param omssId - OMSS identifier
     * @param providerId - Optional provider filter
     * @param abortSignal - Optional abort signal
     * @returns Promise resolving to aggregated source list or an error
     */
    async getSources(omssId: OMSSId, { providerId, abortSignal }: { providerId?: string; abortSignal?: AbortSignal } = {}): Promise<Result<OMSSProviderResults, OMSSProviderError>> {
        const parsed = parseOMSSId(omssId)

        if (!parsed.ok) {
            return parsed
        }

        const providers: UnknownProvider[] = providerId
            ? this.#providerRegistry.getAll((p) => p.id === providerId && p.resolver.namespace === parsed.value.namespace)
            : this.#providerRegistry.getAll((p) => p.resolver.namespace === parsed.value.namespace)

        if (providers.length === 0) {
            return ERR(new OMSSProviderError(`No providers found for namespace "${parsed.value.namespace}"` + (providerId ? ` and provider "${providerId}"` : '')))
        }

        const fallbackController = abortSignal ? null : new AbortController()
        const signal = abortSignal ?? fallbackController!.signal

        const ctx: ResolverExecutionContext = {
            server: this.#omssServer,
            signal,
        }

        const resolverCache = new Map<string, Promise<Result<unknown, OMSSProviderError>>>()

        const aborted = () => ERR(new OMSSProviderError('Operation aborted'))

        const getResolvedMeta = (provider: UnknownProvider): Promise<Result<unknown, OMSSProviderError>> => {
            const resolverKey = `${provider.resolver.namespace}:${provider.resolver.name}`

            let promise = resolverCache.get(resolverKey)

            if (!promise) {
                promise = (async (): Promise<Result<unknown, OMSSProviderError>> => {
                    if (signal.aborted) return aborted()

                    try {
                        const result = await provider.resolver.resolve(parsed.value, ctx)

                        if (!result.ok) {
                            return ERR(new OMSSProviderError(`Resolver failed for ${resolverKey}: ${result.error.message}`))
                        }

                        return OK(result.value)
                    } catch (err) {
                        return ERR(new OMSSProviderError(`Resolver threw for ${resolverKey}: ${err instanceof Error ? err.message : String(err)}`))
                    }
                })()

                resolverCache.set(resolverKey, promise)
            }

            return promise
        }

        const resolveForProvider = async (provider: UnknownProvider): Promise<ProviderResult> => {
            if (signal.aborted) return aborted()

            try {
                const metaResult = await getResolvedMeta(provider)

                if (!metaResult.ok) {
                    return metaResult
                }

                if (signal.aborted) return aborted()

                return await provider.getSources({
                    omssId: parsed.value,
                    meta: metaResult.value,
                })
            } catch (err) {
                return ERR(err instanceof OMSSProviderError ? err : new OMSSProviderError(String(err)))
            }
        }

        const settled = await Promise.allSettled(providers.map((provider) => resolveForProvider(provider)))

        if (signal.aborted) {
            return aborted()
        }

        const sources: string[] = []
        let hasSuccess = false

        for (const item of settled) {
            if (item.status !== 'fulfilled') continue

            const res = item.value
            if (res.ok) {
                hasSuccess = true
                sources.push(...res.value.sources)
            }
        }

        if (!hasSuccess) {
            return ERR(new OMSSProviderError(`All providers failed for namespace "${parsed.value.namespace}"`))
        }

        return OK({ sources })
    }
}
