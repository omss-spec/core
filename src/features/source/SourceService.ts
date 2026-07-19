import OMSSServer from '@/core/server.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { SourceCore } from '@/features/source/SourceCore.js'
import type { GatheredSources, GetSourcesOptions, SourceServiceMiddleware, SourceServiceOperations } from '@/types/source.js'
import type { OMSSId } from '@/types/resolver.js'
import type { Result } from '@/types/utils.js'
import { OMSSSourceGatheringError } from '@/utils/error.js'
import { InFlightRequestPool } from '@/utils/InFlightRequestPool.js'
import { MiddlewareRunner } from '@/utils/middleware.js'
import type { OMSSHooks, ProviderHooks } from '@/types/hooks.js'

/**
 * Public API for resolving sources for media.
 *
 * This service owns the public method surface, middleware execution,
 * lifecycle hook dispatching, and request coalescing. The actual source
 * gathering implementation lives in {@link SourceCore}.
 */
export class SourceService {
    readonly #hookRegistry: HookRegistry<OMSSHooks>
    readonly #core: SourceCore
    readonly #providerHookRegistry: HookRegistry<ProviderHooks>

    /**
     * Middleware runner for SourceService operations.
     */
    readonly #middleware = new MiddlewareRunner<SourceServiceOperations>()

    /**
     * Deduplicates concurrent getSources requests by request key.
     */
    readonly #inFlight = new InFlightRequestPool<string, Result<GatheredSources, OMSSSourceGatheringError>>()

    constructor(omssServer: OMSSServer, providerRegistry: ProviderRegistry, hookRegistry: HookRegistry<OMSSHooks>, providerHookRegistry: HookRegistry<ProviderHooks>) {
        this.#hookRegistry = hookRegistry
        this.#core = new SourceCore(omssServer, providerRegistry)
        this.#providerHookRegistry = providerHookRegistry
    }

    /**
     * Register middleware for a SourceService method.
     *
     * Middleware can be used for cross-cutting concerns such as caching,
     * logging, tracing, or metrics.
     *
     * @param method - Middleware-enabled method name.
     * @param handler - Middleware handler.
     */
    use<TMethod extends keyof SourceServiceOperations>(method: TMethod, handler: SourceServiceMiddleware<TMethod>): void {
        this.#middleware.use(method, handler)
    }

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
    async getSources(omssId: OMSSId, options: GetSourcesOptions = {}): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        return this.#middleware.run('getSources', { omssId, options }, () => this.#internalGetSources(omssId, options))
        // todo: add afterGetSources middleware for filtering etc.
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
    async #internalGetSources(omssId: OMSSId, options: GetSourcesOptions): Promise<Result<GatheredSources, OMSSSourceGatheringError>> {
        await this.#hookRegistry.run('beforeGetSources', {
            omssId,
            providerId: options.providerId,
        })

        const inFlightKey = this.#getInFlightKey(omssId, options.providerId)

        const result = await this.#inFlight.run(inFlightKey, () => this.#core.getSources(omssId, options, this.#providerHookRegistry))

        if (result.ok) {
            await this.#hookRegistry.run('afterGetSources', {
                omssId,
                providerId: options.providerId,
                result: result.value,
            })

            return result
        }

        await this.#hookRegistry.run('getSourcesFailed', {
            omssId,
            providerId: options.providerId,
            error: result.error,
        })

        return result
    }

    /**
     * Build the stable in-flight key for a getSources request.
     *
     * @param omssId - OMSS identifier.
     * @param providerId - Optional provider filter.
     * @returns Unique in-flight request key.
     */
    #getInFlightKey(omssId: OMSSId, providerId?: string): string {
        return `${omssId}|${providerId ?? ''}`
    }
}
