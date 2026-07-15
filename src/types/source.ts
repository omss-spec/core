import { OMSSId } from '@/types/resolver.js'
import { Result } from '@/types/utils.js'
import { OMSSProviderResult } from '@/types/provider.js'
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
    results: OMSSProviderResult[]
    errors: OMSSError[]
}

/**
 * Operations supported by the SourceService Middleware Runner
 */
export type SourceServiceOperations = {
    getSources: {
        context: {
            omssId: OMSSId
            options: GetSourcesOptions
        }
        result: Result<GatheredSources, OMSSSourceGatheringError>
    }
}

/**
 * Middleware function for the SourceService
 */
export type SourceServiceMiddleware<TMethod extends keyof SourceServiceOperations> = MiddlewareHandler<SourceServiceOperations, TMethod>
