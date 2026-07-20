import type OMSSServer from '@/core/server.js'
import { OMSSResolverError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'

/**
 * Canonical OMSS ID representation.
 *
 * The raw string follows the `<namespace>:<value_1>:<value_2>:(...):<value_n>` format and the certain id's/namespaces are standardized by OMSS.
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
     * The ID-values
     */
    values: string[]
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
     * A map of ID converters.
     *
     * @key - The unhandled namespace
     * @value - A function that converts that id (from an unknown namespace/id provider) to this resolver's namespace.
     */
    converter: Map<string, (noHandlerId: OMSSId, ctx: ResolverExecutionContext) => Promise<Result<OMSSId, OMSSResolverError>>>

    /**
     * Resolve a single ID into metadata.
     *
     * @param id - Parsed OMSS ID
     * @param ctx - Execution context.
     */
    resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMetadata>>
}
