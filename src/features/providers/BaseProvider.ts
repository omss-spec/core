import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { OMSSProvider, ProviderResult, ProviderResultEmitter, ProviderSourcesMeta, ResolverMetadata } from '@/types/provider.js'
import type { ParsedOMSSId } from '@/types/resolver.js'

/**
 * Base class for all providers.
 */
export abstract class BaseProvider<P extends BaseResolver<unknown>> implements OMSSProvider<P> {
    /**
     * Provider ID. Must be unique.
     */
    abstract readonly id: string

    /**
     * Friendly name of the provider.
     */
    abstract readonly name: string

    /**
     * Whether the provider will be used.
     */
    abstract readonly enabled: boolean

    /**
     * Catalog of media this provider supports. It does not have to exist. If it does, it should be a list of media IDs.
     * This does not get queried for source resolving, but more metadata about the provider.
     */
    abstract readonly catalog?: () => Promise<string[]> | string[]

    /**
     * Provide a method that checks whether this provider supports a certain ID.
     * @param id - Parsed OMSS ID
     */
    abstract readonly supportsId: (id: ParsedOMSSId) => boolean | Promise<boolean>

    /**
     * Resolvers that this provider supports.
     */
    abstract readonly resolver: P

    /**
     * Fetch sources for a certain media.
     * @param media - Return object of the resolver's resolve() method.
     * @param result - The result emitter.
     */
    abstract getSources(media: ProviderSourcesMeta<ResolverMetadata<P>>, result: ProviderResultEmitter): Promise<ProviderResult>
}
