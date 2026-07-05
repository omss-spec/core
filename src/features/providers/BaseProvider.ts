import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { OMSSProvider, ProviderResult, ProviderSourcesMeta, ResolverMetadata } from '@/types/provider.js'

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
     * Base URL for the provider's API.
     */
    abstract readonly baseUrl: string
    /**
     * Headers to send with every request.
     */
    abstract readonly headers: Record<string, string>

    /** IDs that this provider supports. That are the ID values of OMSS IDs. Meaning without the namespace.
     * @example ["12345", "67890"]
     * @example ['*'] // for all IDs
     */
    abstract readonly supportedIds: string[] | (() => string[] | Promise<string[]>)

    /**
     * Resolvers that this provider supports.
     */
    abstract readonly resolver: P

    /**
     * Fetch sources for a certain media.
     * @param media - Return object of the resolver's resolve() method.
     */
    abstract getSources(media: ProviderSourcesMeta<ResolverMetadata<P>>): Promise<ProviderResult>
}
