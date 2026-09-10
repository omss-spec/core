import type OMSSServer from '@/core/OMSSServer.js'
import { type OMSSResolverError } from '@/utils/error.js'
import { type Result } from '@/types/utils.js'

/**
 * Canonical OMSS ID representation.
 *
 * Follows the `<namespace>:<value_1>:<value_2>:(...):<value_n>` format;
 * certain namespaces and value shapes are standardized by the OMSS spec.
 */
export type OMSSId = string

/**
 * Parsed representation of an OMSS ID, as returned by `parseOMSSId()`.
 */
export interface ParsedOMSSId {
    /**
     * The ID's namespace, e.g. `"tmdb"`.
     */
    namespace: string
    /**
     * The ID's values, in order, URL-decoded.
     */
    values: string[]
    /**
     * The original, unparsed ID string.
     */
    raw: OMSSId
}

/**
 * Context passed into a resolver's `resolve()` method.
 */
export interface ResolverExecutionContext {
    /**
     * The OMSS server instance, giving access to plugins, config, and other shared state.
     */
    server: OMSSServer
    /**
     * Abort signal for cancellation.
     */
    signal: AbortSignal
}

/**
 * The result returned by a resolver's `resolve()` method - metadata for providers.
 *
 * @typeParam T - The shape of the resolved metadata.
 */
export type ResolverResult<T> = Result<T, OMSSResolverError>

/**
 * Converts an OMSS ID into metadata a provider can use to fetch sources.
 *
 * Typically implemented via `defineResolver()` rather than this interface directly.
 *
 * @typeParam TMetadata - The shape of the metadata this resolver produces.
 */
export interface OMSSResolver<TMetadata> {
    /**
     * The namespace this resolver owns, e.g. `"tmdb"`. Must be unique for a single server instance.
     */
    namespace: string

    /**
     * A human-readable resolver name.
     */
    name: string

    /**
     * ID converters, keyed by the namespace they convert *from*.
     *
     * Each entry converts an ID in an unhandled namespace into an ID this
     * resolver's own namespace can resolve.
     */
    converter: Map<string, (noHandlerId: OMSSId, ctx: ResolverExecutionContext) => Promise<Result<OMSSId, OMSSResolverError>>>

    /**
     * Resolves a single ID into metadata.
     *
     * @param id - The parsed OMSS ID to resolve.
     * @param ctx - Execution context.
     * @returns The resolved metadata, or an error if resolution failed.
     */
    resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMetadata>>
}
