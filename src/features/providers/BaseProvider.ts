import type { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { OMSSProvider, ProviderResult, ProviderSourcesMeta } from '@/types/provider.js'

/**
 * Base class for all providers.
 */
export abstract class BaseProvider<T, K> implements OMSSProvider<BaseResolver<T>> {
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
    /**
     * Resolvers that this provider supports.
     */
    abstract readonly resolver: BaseResolver<T>

    /**
     * Fetch sources for a certain media.
     * @param media - Metadata for a single media item. The type of this object depends on the resolvers in the resolvers array. Note that if several resolvers match the namespace, the first one will be used.
     */
    abstract getSources<T>(media: ProviderSourcesMeta<T>): Promise<ProviderResult>
}
