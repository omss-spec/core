import { OMSSResolver, ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'

/**
 * Base class for all OMSS resolvers.
 *
 * Resolvers convert an OMSS ID into usable metadata for providers.
 */
export abstract class BaseResolver<T> implements OMSSResolver<T> {
    /**
     * Namespace this resolver owns, e.g. "tmdb".
     */
    abstract namespace: string

    /**
     * Human-readable resolver name.
     */
    abstract name: string

    /**
     * Resolve a single ID into metadata.
     *
     * @param id - Parsed OMSS ID
     * @param ctx - Execution context.
     */
    abstract resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<T>>
}
