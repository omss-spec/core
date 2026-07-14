import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'
import { ERR, OK } from '@/utils/utils.js'
import { OMSSResolverError } from '@/utils/error.js'
import { BaseProvider } from '@/features/providers/BaseProvider.js'
import { ProviderResult, ProviderSourcesMeta, ResolverMetadata } from '@/types/provider.js'
import { RegisterProvider } from '@/features/source/public-api.js'

export interface TMDBMedia {
    id: number
    title: string
}

export class TMDBResolver extends BaseResolver<TMDBMedia> {
    namespace = 'tmdb'
    name = 'TMDB'

    async resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMedia>> {
        try {
            // Simulate an API call to TMDB
            const media = await new Promise<TMDBMedia>((resolve) => {
                setTimeout(() => {
                    resolve({ id: parseInt(id.value), title: 'Example Movie' })
                }, 1000)
            })
            return OK(media)
        } catch (e) {
            return ERR(new OMSSResolverError('Failed to resolve media'))
        }
    }
}

const resolver = new TMDBResolver()

class DiscoveredProvider extends BaseProvider<typeof resolver> {
    readonly baseUrl = 'https://example.com/api/v1/'
    readonly enabled = true
    readonly headers = { 'Content-Type': 'application/json' }
    readonly id = 'discovered-provider'
    readonly name = 'Discovery'
    readonly resolver = resolver
    readonly supportedIds = ['*']

    async getSources(media: ProviderSourcesMeta<ResolverMetadata<typeof resolver>>): Promise<ProviderResult> {
        // media.meta is TMDBMedia — title and id are available
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(OK({ sources: ['https://example.com/stream/1.m3u8'] }))
            }, 1000)
        })
    }
}

// @RegisterProvider
// extends BaseProvider

RegisterProvider()(DiscoveredProvider as unknown as new () => any)
