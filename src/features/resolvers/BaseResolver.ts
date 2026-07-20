import { OMSSResolverError, Result } from '@/public-api.js'
import { OMSSId, OMSSResolver, ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'

/**
 * Base class for all OMSS resolvers.
 *
 * Resolvers convert an OMSS ID into usable metadata for providers.
 */
export abstract class BaseResolver<T> implements OMSSResolver<T> {
    /**
     * Namespace this resolver owns, e.g. "tmdb".
     * Must be unique for a single server instance.
     */
    abstract namespace: string

    /**
     * Human-readable resolver name.
     */
    abstract name: string

    /**
     * A map of ID converters.
     *
     * @key - The unhandled namespace
     * @value - A function that converts that id (from an unknown namespace/id provider) to this resolver's namespace.
     */
    abstract converter: Map<string, (noHandlerId: OMSSId, ctx: ResolverExecutionContext) => Promise<Result<OMSSId, OMSSResolverError>>>

    /**
     * Resolve a single ID into metadata.
     *
     * @param id - Parsed OMSS ID
     * @param ctx - Execution context.
     */
    abstract resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<T>>
}
