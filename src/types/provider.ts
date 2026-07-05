import type { ParsedOMSSId } from '@/types/resolver.js'
import type { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { OMSSProviderError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'

/**
 * Core provider interface.
 *
 * @typeParam P - The resolver class this provider is bound to.
 *               The return type of P['resolve'] determines the `meta`
 *               parameter shape of getSources().
 */
export interface OMSSProvider<P extends BaseResolver<unknown>> {
    /** Provider ID. Must be unique. */
    readonly id: string

    /** Friendly name of the provider. */
    readonly name: string

    /** Whether the provider will be used. */
    readonly enabled: boolean

    /** Base URL for the provider's API. */
    readonly baseUrl: string

    /** Headers to send with every request. */
    readonly headers: Record<string, string>

    /** IDs that this provider supports. That are the ID values of OMSS IDs. Meaning without the namespace.
     * @example ["12345", "67890"]
     * @example ['*'] // for all IDs
     */
    readonly supportedIds: string[] | (() => string[] | Promise<string[]>)

    /** Resolver that this provider is bound to. */
    readonly resolver: P

    /**
     * Fetch sources for a certain media.
     * The shape of `media.meta` is derived from the resolver's resolve() return type.
     */
    getSources(media: ProviderSourcesMeta<ResolverMetadata<P>>): Promise<ProviderResult>
}

/**
 * Extract the metadata type from a resolver's resolve method.
 */
export type ResolverMetadata<R extends BaseResolver<unknown>> = Extract<Awaited<ReturnType<R['resolve']>>, { ok: true }> extends { value: infer T } ? T : never

/**
 * The object passed to providers when they are executed.
 */
export type ProviderSourcesMeta<T> = {
    omssId: ParsedOMSSId
    /** Metadata returned by the resolver */
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
