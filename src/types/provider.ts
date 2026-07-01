import type { ParsedOMSSId, ResolverResult } from '@/types/resolver.js'
import type { BaseResolver } from '@/services/resolvers/BaseResolver.js'
import type { OMSSProviderError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'

export interface OMSSProvider<Rs extends readonly BaseResolver<unknown>[]> {
    /**
     * Provider ID. Must be unique.
     */
    readonly id: string

    /**
     * Friendly name of the provider.
     */
    readonly name: string

    /**
     * Whether the provider will be used.
     */
    readonly enabled: boolean

    /**
     * Base URL for the provider's API.
     */
    readonly baseUrl: string

    /**
     * Headers to send with every request.
     */
    readonly headers: Record<string, string>

    /**
     * Resolvers that this provider supports.
     */
    readonly resolvers: Rs

    /**
     * Fetch sources for a certain media.
     */
    getSources(media: ProviderSourcesMeta<ResolverMetadataUnion<Rs>>): Promise<ProviderResult>
}

/**
 * Extract the metadata type from a resolver's resolve method.'
 */
type ResolverMetadata<R extends BaseResolver<unknown>> = Awaited<ReturnType<R['resolve']>> extends ResolverResult<infer T> ? T : never

/**
 * Extract the metadata type from a union of resolvers.
 */
type ResolverMetadataUnion<Rs extends readonly BaseResolver<unknown>[]> = ResolverMetadata<Rs[number]>

/**
 * Convenience alias for any provider instance.
 */
export type UnknownProvider = OMSSProvider<readonly BaseResolver<unknown>[]>

/**
 * The object passed to providers when they are executed.
 */
export type ProviderSourcesMeta<T> = ResolverResult<T> & ParsedOMSSId

/**
 * The result of a provider getSources call.
 */
export type ProviderResult = Result<OMSSProviderResults, OMSSProviderError>

/**
 * The result of a provider getSources call if successful.
 */
export interface OMSSProviderResults {
    sources: string[]
}
