import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import OMSSServer from '@/core/server.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { OMSSProviderResult, ProviderResult, UnknownProvider } from '@/types/provider.js'
import { OMSSId, ResolverExecutionContext } from '@/types/resolver.js'
import { parseOMSSId } from '@/features/resolvers/utils.js'
import { OMSSError, OMSSProviderError, OMSSSourceGatheringError } from '@/utils/error.js'
import { ERR, OK } from '@/utils/utils.js'
import { Result } from '@/types/utils.js'
import { MiddlewareRunner } from '@/utils/middleware.js'
import { GatheredSources, GetSourcesOptions, SourceServiceMiddleware, SourceServiceOperations } from '@/types/source.js'

/**
 * The public API for resolving sources for media.
 */
export class SourceService {
    readonly #providerRegistry: ProviderRegistry
    readonly #hookRegistry: HookRegistry
    readonly #omssServer: OMSSServer
    /**
     * Middleware runner for SourceService operations.
     */
    readonly #middleware = new MiddlewareRunner<SourceServiceOperations>()

    /**
     * In-flight request cache.
     *
     * When multiple callers request sources for the exact same `omssId` +
     * optional `providerId` simultaneously, they share one Promise instead of
     * spawning duplicate resolver / provider calls. The entry is removed once
     * the shared Promise settles so that subsequent (non-concurrent) calls
     * always start fresh.
     *
     * Key format: `"<omssId>|<providerId ?? ''>"`.
     */
    readonly #inFlightMap = new Map<string, Promise<Result<GatheredSources, OMSSSourceGatheringError>>>()

    constructor(omssServer: OMSSServer, providerRegistry: ProviderRegistry, hookRegistry: HookRegistry) {
        this.#omssServer = omssServer
        this.#providerRegistry = providerRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Register middleware for a SourceService method.
     *
     * @param method - Middleware-enabled method name.
     * @param handler - Middleware handler.
     */
    use<TMethod extends keyof SourceServiceOperations>(method: TMethod, handler: SourceServiceMiddleware<TMethod>): void {
        this.#middleware.use(method, handler)
    }

    /**
     * Fetches and aggregates sources from all matching providers/resolvers for
     * an OMSS id.
     *
     * Concurrent calls for the same `omssId` + `providerId` pair are
     * automatically coalesced into one in-flight request — all callers await
     * the same underlying Promise and receive the same result.
     * Concurrent requests share the first request's AbortSignal, if any. If the first request is aborted, all concurrent requests are aborted as well.
     *
     * This method is middleware-enabled, allowing for preprocessors to be
     * applied before the source resolution process starts (i.e. caching, etc.).
     *
     * @param omssId - OMSS identifier (e.g. `"tmdb:12345"`).
     * @param options - Optional parameters.
     * @returns Promise resolving to an aggregated source list or an error.
     */
    async getSources(omssId: OMSSId, options: GetSourcesOptions = {}): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        return this.#middleware.run('getSources', { omssId, options }, () => this.#internalGetSources(omssId, options))
    }

    /**
     * Private. This is another abstraction of the original implementation to catch inflight requests.
     *
     * @param omssId - OMSS identifier (e.g. `"tmdb:12345"`).
     * @param opts - Optional parameters.
     * @returns Promise resolving to an aggregated source list or an error.
     */
    async #internalGetSources(omssId: OMSSId, opts: GetSourcesOptions): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        // run the first hook
        await this.#hookRegistry.run('beforeGetSources', { omssId, providerId: opts.providerId })

        // build the inflight key for other requests to recognize
        const inFlightKey = `${omssId}|${opts.providerId ?? ''}`

        // if there already exists a promise currently loading, return that promise instead of creating a new one
        const existing = this.#inFlightMap.get(inFlightKey)
        if (existing) {
            return existing
        }

        // create a new promise and store it in the map
        const promise = (async () => {
            // try to do the source gathering
            try {
                // call the second internal method
                const result = await this.#resolveSources(omssId, opts)

                if (result.ok) {
                    // run the second hook
                    await this.#hookRegistry.run('afterGetSources', {
                        omssId,
                        providerId: opts.providerId,
                        result: result.value,
                    })
                } else {
                    // run the fail hook
                    await this.#hookRegistry.run('getSourcesFailed', {
                        omssId,
                        providerId: opts.providerId,
                        error: result.error,
                    })
                }

                // return the result
                return result
            } finally {
                // if it fails, we should delete this promise, since the next request will spawn a new one again.
                this.#inFlightMap.delete(inFlightKey)
            }
        })()

        // store the promise in the map
        this.#inFlightMap.set(inFlightKey, promise)

        // and return it
        return promise
    }

    /**
     * The actual implementation of source resolution — called once per unique
     * in-flight key. Handles ID parsing, provider lookup, resolver deduplication,
     * and result aggregation.
     *
     * @param omssId - Raw OMSS ID string.
     * @param opts - Optional parameters.
     * @returns Promise resolving to an aggregated source list or an error.
     */
    async #resolveSources(omssId: OMSSId, opts: GetSourcesOptions): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        // try to parse the OMSS ID
        const parsed = parseOMSSId(omssId)

        if (!parsed.ok) {
            return ERR(new OMSSSourceGatheringError(`Failed to parse OMSS id "${omssId}": ${parsed.error.message}`, { cause: parsed.error }))
        }

        // we know that the id is valid now. Now we got to find the providers that can handle that namespace. If a specific provider is requested, we only look for that one.
        const providers: UnknownProvider[] = opts.providerId
            ? this.#providerRegistry.getAll((p) => p.id === opts.providerId && p.resolver.namespace === parsed.value.namespace)
            : this.#providerRegistry.getAll((p) => p.resolver.namespace === parsed.value.namespace)

        // if no provider can handle that namespace, return an error
        if (providers.length === 0) {
            return ERR(new OMSSSourceGatheringError(`No providers found for namespace "${parsed.value.namespace}"` + (opts.providerId ? ` and provider "${opts.providerId}"` : '')))
        }

        // if no abortsignal comes, just create a new one (does not abort)
        const signal = opts.abortSignal ?? new AbortController().signal

        // create the resolver context
        const ctx: ResolverExecutionContext = {
            server: this.#omssServer,
            signal,
        }

        /**
         * Resolver-level deduplication: multiple providers that share the same
         * resolver run that resolver only once, then share the result.
         */
        const resolverCache = new Map<string, Promise<Result<unknown, OMSSSourceGatheringError>>>()

        // helper function to abort the operation
        const aborted = <E extends OMSSError>(ErrorClass: new (message: string) => E): Result<never, E> => ERR(new ErrorClass('Operation aborted'))

        // helper function to get the resolved metadata for a provider
        const getResolvedMeta = (provider: UnknownProvider): Promise<Result<unknown, OMSSSourceGatheringError>> => {
            // build the resolver key
            const resolverKey = `${provider.resolver.namespace}:${provider.resolver.name}`

            // check if we already have a cached promise for this resolver
            let promise = resolverCache.get(resolverKey)

            if (!promise) {
                // if not, create a new promise to get the metadata
                promise = (async (): Promise<Result<unknown, OMSSSourceGatheringError>> => {
                    // check if the operation was aborted before starting the resolver
                    if (signal.aborted) return aborted(OMSSProviderError)

                    // run the resolver
                    const result = await provider.resolver.resolve(parsed.value, ctx)

                    // check if the operation was aborted while running the resolver
                    if (!result.ok) {
                        return ERR(new OMSSSourceGatheringError(`Resolver failed for ${resolverKey}: ${result.error.message}`, { cause: result.error }))
                    }

                    // this is the metadata from that resolver, which we will pass to the provider
                    return OK(result.value)
                })()

                // cache the promise for future use
                resolverCache.set(resolverKey, promise)
            }

            // return the cached/newly cached promise
            return promise
        }

        // helper function to get the sources for a provider
        const resolveForProvider = async (provider: UnknownProvider): Promise<ProviderResult> => {
            // if the operation was aborted before starting the provider, return an error (i.e. if the operation has been canceled between gathering metadata and gathering sources)
            if (signal.aborted) return ERR(new OMSSProviderError('Operation aborted'))

            // get the metadata for this provider (possibly cached if shared with other providers in the same request)
            const metaResult = await getResolvedMeta(provider)

            // error chain. if the metadata failed, the provider will not be called, so we can just return the error directly.
            if (!metaResult.ok) {
                return metaResult
            }

            // if the operation was aborted while gathering metadata, cancel.
            if (signal.aborted) return ERR(new OMSSProviderError('Operation aborted'))

            // get the sources for this provider
            return provider.getSources({
                omssId: parsed.value,
                meta: metaResult.value,
            })
        }

        // start all providers in parallel. the first provider to call the resolver will be the one to create the promise. all others jump in on that same promise
        // and as soon as the metadata is resolved, the provider will be called.
        const settled = await Promise.allSettled(providers.map((provider) => resolveForProvider(provider)))

        // check if the operation was aborted while gathering sources
        if (signal.aborted) return aborted(OMSSProviderError)

        // the collection of the results
        const sources: OMSSProviderResult[] = []
        // unexpected errors
        const unexpectedErrors: unknown[] = []
        // providers did not throw but returned an OMSS Error
        const omssErrors: OMSSError[] = []
        // check if at least one provider succeeded. If not, we will return an error.
        let hasSuccess = false

        // check every provider result and collect the sources and errors.
        for (const item of settled) {
            if (item.status === 'rejected') {
                // it failed. collect error and go to the next provider. (thrown errors)
                unexpectedErrors.push(item.reason)
                continue
            }

            // get the result
            const res = item.value

            // if the provider succeeded, collect the sources and go to the next provider.
            if (res.ok) {
                hasSuccess = true
                sources.push(res.value)
            } else {
                // collect the error and go to the next provider.
                omssErrors.push(res.error)
            }
        }

        // no providers worked
        if (!hasSuccess) {
            // return an error and add all errors to the cause chain.
            return ERR(
                new OMSSSourceGatheringError(`All providers failed for namespace "${parsed.value.namespace}" and id: "${parsed.value.value}"`, {
                    cause: new AggregateError([...omssErrors, ...unexpectedErrors], 'Multiple failures detected'),
                })
            )
        }

        // at least one worked. return the sources and errors.
        return OK({
            results: sources,
            errors: omssErrors,
        })
    }
}
