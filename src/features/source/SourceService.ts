import type OMSSServer from '@/core/OMSSServer.js'
import { type HookRegistry } from '@/features/hooks/HookRegistry.js'
import { type ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { createSourceCore } from '@/features/source/SourceCore.js'
import type { CleaningFunction, GatheredSources, GetSourcesOptions, SourceServiceMiddleware, SourceServiceOperations } from '@/types/source.js'
import type { OMSSId } from '@/types/resolver.js'
import type { Result } from '@/types/utils.js'
import { type OMSSSourceGatheringError } from '@/utils/error.js'
import { createAsyncDeduper } from '@/utils/AsyncDeduper.js'
import { createMiddlewareRunner } from '@/utils/MiddlewareRunner.js'
import type { OMSSHooks, ProviderHooks } from '@/types/hooks.js'
import { type ExtractorService } from '@/features/extractors/ExtractorService.js'
import { createHookService } from '@/features/hooks/HookService.js'

/**
 * Public API for resolving sources for media.
 *
 * This service owns the public method surface, middleware execution,
 * lifecycle hook dispatching, and request coalescing. The actual source
 * gathering implementation lives in {@link SourceCore}.
 */
export interface SourceService {
    /**
     * Get and set the cleaning function used to sanitize source/subtitle URLs and headers.
     */
    cleaningFunction: CleaningFunction

    /**
     * Registers middleware for a SourceService method.
     *
     * Middleware can be used for cross-cutting concerns such as caching,
     * logging, tracing, or metrics.
     *
     * @typeParam TMethod - The middleware-enabled operation to add a handler for.
     * @param method - The operation name (`"getSources"` or `"afterGetSources"`).
     * @param handler - The middleware handler.
     */
    use<TMethod extends keyof SourceServiceOperations>(method: TMethod, handler: SourceServiceMiddleware<TMethod>): void

    /**
     * Fetch sources from all matching providers for an OMSS ID.
     *
     * This method is middleware-enabled. Concurrent requests for the same
     * `omssId` and `providerId` share the same in-flight Promise until the
     * request settles.
     *
     * @param omssId - OMSS identifier such as `"tmdb:12345"`.
     * @param options - Optional source gathering parameters.
     * @returns Aggregated provider results or a source gathering error.
     */
    getSources(omssId: OMSSId, options?: GetSourcesOptions): Promise<Result<GatheredSources, OMSSSourceGatheringError>>
}

/**
 * Creates a new {@link SourceService}.
 *
 * @param omssServer - The OMSS server instance.
 * @param providerRegistry - The provider registry to look up providers in.
 * @param hookRegistry - The hook registry used to dispatch source lifecycle hooks.
 * @param extractorService - The extractor service exposed to providers.
 */
export function createSourceService(omssServer: OMSSServer, providerRegistry: ProviderRegistry, hookRegistry: HookRegistry<OMSSHooks>, extractorService: ExtractorService): SourceService {
    const core = createSourceCore(omssServer, providerRegistry, extractorService)

    /**
     * Middleware runner for SourceService operations.
     */
    const middleware = createMiddlewareRunner<SourceServiceOperations>()

    /**
     * Deduplicates concurrent getSources requests by request key.
     */
    const inFlight = createAsyncDeduper<string, Result<GatheredSources, OMSSSourceGatheringError>>()

    let cleaningFunction: CleaningFunction = (obj) => obj

    /**
     * Build the stable in-flight key for a getSources request.
     *
     * @param omssId - OMSS identifier.
     * @param providerId - Optional provider filter.
     * @returns Unique in-flight request key.
     */
    function getInFlightKey(omssId: OMSSId, providerId?: string): string {
        return `${omssId}|${providerId ?? ''}`
    }

    /**
     * Internal wrapper around source gathering.
     *
     * Runs lifecycle hooks and deduplicates concurrent requests before
     * delegating to {@link SourceCore}.
     *
     * @param omssId - OMSS identifier.
     * @param options - Optional source gathering parameters.
     * @returns Aggregated provider results or a source gathering error.
     */
    async function internalGetSources(omssId: OMSSId, options: GetSourcesOptions): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        await hookRegistry.run('beforeGetSources', {
            omssId,
            providerId: options.providerId,
        })

        const inFlightKey = getInFlightKey(omssId, options.providerId)

        const result = await inFlight.run(inFlightKey, () =>
            core.getSources(omssId, options, options.providerHookService ?? createHookService<ProviderHooks>(), options.cleaningFunction ?? cleaningFunction)
        )

        if (result.ok) {
            await hookRegistry.run('afterGetSources', {
                omssId,
                providerId: options.providerId,
                result: result.value,
            })

            return middleware.run('afterGetSources', { omssId, options, result }, () => Promise.resolve(result))
        }

        await hookRegistry.run('getSourcesFailed', {
            omssId,
            providerId: options.providerId,
            error: result.error,
        })

        return result
    }

    return {
        get cleaningFunction() {
            return cleaningFunction
        },

        set cleaningFunction(fn) {
            cleaningFunction = fn
        },

        use(method, handler) {
            middleware.use(method, handler)
        },

        async getSources(omssId, options = {}) {
            return middleware.run('getSources', { omssId, options }, () => internalGetSources(omssId, options))
        },
    }
}
