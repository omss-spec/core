import { OMSSId } from '@/types/resolver.js'
import { Result } from '@/types/utils.js'
import { Source, Subtitle } from '@/types/provider.js'
import { OMSSError, OMSSSourceGatheringError } from '@/utils/error.js'
import { MiddlewareHandler } from '@/types/middleware.js'

/**
 * Options for fetching sources.
 */
export type GetSourcesOptions = {
    providerId?: string
    abortSignal?: AbortSignal
}

/**
 * Object returned by the SourceService.GetSources() method if there has been at least one successful provider.
 */
export type GatheredSources = {
    /**
     * Array of sources.
     */
    sources: Source[]
    /**
     * Array of subtitle tracks.
     */
    subtitles: Subtitle[]
    /**
     * Array of errors.
     */
    errors: OMSSError[]
}

/**
 * Operations supported by the SourceService Middleware Runner with the according context and result types.
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
 * Middleware function for the SourceService
 */
export type SourceServiceMiddleware<TMethod extends keyof SourceServiceOperations> = MiddlewareHandler<SourceServiceOperations, TMethod>
