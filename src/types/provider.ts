import type { ParsedOMSSId, ResolverResult } from '@/types/resolver.js'
import type { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { OMSSProviderError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { OK } from '@/utils/utils.js'

export interface OMSSProvider<K, P extends BaseResolver<K>> {
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
     * Resolver that this provider supports.
     */
    readonly resolver: P

    /**
     * Fetch sources for a certain media.
     */
    getSources(media: ProviderSourcesMeta<ResolverMetadata<P>>): Promise<ProviderResult>
}

/**
 * Extract the metadata type from a resolver's resolve method.
 */
export type ResolverMetadata<R extends BaseResolver<unknown>> = Awaited<ReturnType<R['resolve']>> extends ResolverResult<typeof OK<infer T>> ? T : never

/**
 * Convenience alias for any provider instance.
 */
export type UnknownProvider = OMSSProvider<BaseResolver<unknown>>

/**
 * The object passed to providers when they are executed.
 */
export type ProviderSourcesMeta<T> = {
    omssId: ParsedOMSSId
    /// Metadata returned by the resolver
    meta: T
}

/**
 * The result of a provider getSources call.
 */
export type ProviderResult = Result<OMSSProviderResults, OMSSProviderError>

/**
 * The result of a provider getSources call if successful.
 */
export interface OMSSProviderResults {
    // TODO: define schema.
    sources: string[]
}
