import type OMSSServer from '@/core/server.js'
import { OMSSResolverError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'

/**
 * Canonical OMSS ID representation.
 *
 * The raw string follows the `namespace:value` convention (e.g. "tmdb:12345").
 */
export type OMSSId = string

/**
 * Parsed representation of an OMSS ID.
 */
export interface ParsedOMSSId {
    /**
     * The ID namespace
     */
    namespace: string
    /**
     * The ID-provider-owned value
     */
    value: string
    /**
     * The original raw ID string
     */
    raw: OMSSId
}

/**
 * Context passed into resolvers when executing them.
 */
export interface ResolverExecutionContext {
    /**
     * OMSS server instance – gives access to plugins, config, etc.
     */
    server: OMSSServer
    /**
     * Abort signal for cancellation.
     */
    signal: AbortSignal
}

/**
 * Result returned by a resolver – metadata for providers.
 */
export type ResolverResult<T> = Result<T, OMSSResolverError>

/**
 * Base interface for all OMSS resolvers.
 *
 * Resolvers convert an OMSS ID into usable metadata for providers.
 */
export interface OMSSResolver<TMetadata> {
    /**
     * Namespace this resolver owns, e.g. "tmdb".
     */
    namespace: string

    /**
     * Human-readable resolver name.
     */
    name: string

    /**
     * Resolve a single ID into metadata.
     *
     * @param id - Parsed OMSS ID
     * @param ctx - Execution context.
     */
    resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMetadata>>
}
