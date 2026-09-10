import { type OMSSId } from '@/types/resolver.js'
import { type Result } from '@/types/utils.js'
import { type Source, type Subtitle } from '@/types/provider.js'
import { type OMSSError, type OMSSSourceGatheringError } from '@/utils/error.js'
import { type MiddlewareHandler } from '@/types/middleware.js'
import { type ProviderHooks } from '@/types/hooks.js'
import { type HookService } from '@/features/hooks/HookService.js'

/**
 * Options for `server.sources.getSources()`.
 */
export type GetSourcesOptions = {
    /**
     * Restrict gathering to a single provider ID. If omitted, every registered
     * provider for the ID's namespace is queried.
     */
    providerId?: string
    /**
     * Abort signal for cancellation. If omitted, the request cannot be aborted.
     */
    abortSignal?: AbortSignal
    /**
     * Overrides the service-wide {@link SourceService.cleaningFunction} for this call only.
     */
    cleaningFunction?: CleaningFunction
    /**
     * A hook service scoped to this single request, letting callers observe
     * (or clean up after) exactly one `getSources()` call instead of every one.
     */
    providerHookService?: HookService<ProviderHooks>
}

/**
 * The aggregated result of a successful `getSources()` call - at least one
 * provider succeeded.
 */
export type GatheredSources = {
    /**
     * All sources gathered across every successful provider.
     */
    sources: Source[]
    /**
     * All subtitle tracks gathered across every successful provider.
     */
    subtitles: Subtitle[]
    /**
     * Non-fatal errors collected along the way, even though the call as a whole succeeded.
     */
    errors: OMSSError[]
}

/**
 * Operations supported by {@link SourceService}'s middleware runner, with their context and result types.
 */
export type SourceServiceOperations = {
    getSources: {
        context: {
            omssId: OMSSId
            options: GetSourcesOptions
        }
        result: Result<GatheredSources, OMSSSourceGatheringError>
    }
    afterGetSources: {
        context: {
            omssId: OMSSId
            options: GetSourcesOptions
            result: Result<GatheredSources, OMSSSourceGatheringError>
        }
        result: Result<GatheredSources, OMSSSourceGatheringError>
    }
}

/**
 * Middleware function for a {@link SourceService} operation.
 */
export type SourceServiceMiddleware<TMethod extends keyof SourceServiceOperations> = MiddlewareHandler<SourceServiceOperations, TMethod>

/**
 * Cleans a source/subtitle URL and its headers before it's emitted.
 *
 * Called by the {@link ProviderResultEmitter} between a source/subtitle being
 * registered and it being emitted - typically used to append auth tokens or
 * strip internal query parameters.
 */
export type ObjectToClean = {
    /**
     * The URL to clean.
     */
    url: string
    /**
     * The headers to clean.
     */
    header: Record<string, string>
}

/**
 * A function that cleans a source/subtitle URL and headers. See {@link ObjectToClean}.
 *
 * @param obj - The URL and headers to clean.
 * @returns The cleaned URL and headers.
 */
export type CleaningFunction = (obj: ObjectToClean) => ObjectToClean
