import {
    BaseProvider,
    BaseResolver,
    ERR,
    OK,
    OMSSResolverError,
    OMSSServer,
    ParsedOMSSId,
    ProviderResult,
    ProviderSourcesMeta,
    ResolverExecutionContext,
    ResolverMetadata,
    ResolverResult,
} from '../src/index.js'

const httpPlugin = async () => {
    console.log('HTTP plugin loaded')
}

export interface TMDBMedia {
    id: number
    title: string
}

class TMDBResolver extends BaseResolver<TMDBMedia> {
    namespace = 'tmd b'
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

export const resolver = new TMDBResolver()

class FlixProvider extends BaseProvider<typeof resolver> {
    readonly enabled = true
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly resolver = resolver
    readonly supportsId = (id: ParsedOMSSId) => {
        return true
    }

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

const server = new OMSSServer({ name: 'example' })

const res = await server.providers.register(new FlixProvider())

console.log(res)

console.log('FINAL', server.providers.getAll().length)
