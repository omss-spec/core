import type OMSSServer from '@/core/server.js'

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
    /** The ID namespace, e.g. "tmdb", "einthusan". */
    namespace: string
    /** The opaque provider-owned value, e.g. "12345". */
    value: string
    /** The original raw ID string, e.g. "tmdb:12345". */
    raw: OMSSId
}

/**
 * Context passed into resolvers when executing them.[cite:51]
 */
export interface ResolverExecutionContext {
    /** OMSS server instance – gives access to plugins, config, etc. */
    server: OMSSServer
    /** Abort signal for cancellation. */
    signal: AbortSignal
}

/**
 * Result returned by a resolver – metadata for providers.
 */
export interface OMSSResolverResult<TMetadata = unknown> {
    /** Resolver-specific metadata that providers consume. */
    metadata: TMetadata
}

/**
 * Base interface for all OMSS resolvers.
 *
 * Resolvers convert an OMSS ID into usable metadata for providers.
 */
export interface OMSSResolver<TMetadata = unknown> {
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
    resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<OMSSResolverResult<TMetadata>>
}

/**
 * Convenience alias for any resolver instance.
 */
export type UnknownResolverType = OMSSResolver
