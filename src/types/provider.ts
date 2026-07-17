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

    /**
     * Catalog of media this provider supports. It does not have to exist. If it does, it should be a list of media IDs.
     * This does not get queried for source resolving, but more metadata about the provider.
     */
    readonly catalog?: string[] | (() => Promise<string[]>)

    /**
     * Provide a method that checks whether this provider supports a certain ID.
     * @param id - Parsed OMSS ID
     */
    readonly supportsId: (id: ParsedOMSSId) => boolean | Promise<boolean>

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
 * Provider with an unknown resolver. Utils for other services and registries
 */
export type UnknownProvider = OMSSProvider<BaseResolver<unknown>>

/**
 * The result of a provider getSources call.
 */
export type ProviderResult = Result<OMSSProviderResult, OMSSProviderError>

/**
 * The result of a provider getSources call if successful.
 */
export interface OMSSProviderResult {
    // TODO: define schema.
    sources: string[]
}

/**
 * A middleware function for the provider `register` pipeline.
 *
 * Receives the provider being registered and a `next` function to call
 * the next middleware (or the final `add` step). Return an `ERR` to
 * short-circuit registration with a custom error.
 */
export type RegisterMiddleware = (provider: UnknownProvider, next: () => Promise<Result<UnknownProvider, OMSSProviderError>>) => Promise<Result<UnknownProvider, OMSSProviderError>>
