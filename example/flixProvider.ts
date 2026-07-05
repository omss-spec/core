import { BaseProvider, OK, ProviderResult, ProviderSourcesMeta, RegisterProvider, ResolverMetadata } from '../src/index.js'
// @ts-ignore
import { resolver } from './tmdbResolver.js'

@RegisterProvider()
export class FlixProvider extends BaseProvider<typeof resolver> {
    readonly baseUrl = 'https://example.com/api/v1/'
    readonly enabled = true
    readonly headers = { 'Content-Type': 'application/json' }
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly resolver = resolver
    readonly supportedIds = ['*']

    async getSources(media: ProviderSourcesMeta<ResolverMetadata<typeof resolver>>): Promise<ProviderResult> {
        // media.meta is TMDBMedia — title and id are available
        console.log(`Fetching sources for: ${media.meta.title} (id: ${media.meta.id})`)
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(OK({ sources: ['https://example.com/stream/1.m3u8'] }))
            }, 1000)
        })
    }
}
