import {
    BaseProvider,
    BaseResolver,
    ERR,
    OK,
    OMSSResolverError,
    OMSSServer,
    ParsedOMSSId,
    parseOMSSId,
    ProviderResult,
    ProviderSourcesMeta,
    ResolverExecutionContext,
    ResolverMetadata,
    ResolverResult,
} from '../src/index.js'

const server = new OMSSServer({ name: 'example' })

interface TMDBMedia {
    id: number
    title: string
}

// --- Concrete resolver ---
class TMDBResolver extends BaseResolver<TMDBMedia> {
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

class FlixProvider extends BaseProvider<typeof resolver> {
    readonly baseUrl = 'https://example.com/api/v1/'
    readonly enabled = true
    readonly headers = { 'Content-Type': 'application/json' }
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly resolver = resolver
    readonly supportedIds = ['*']

    // meta is inferred as TMDBMedia — fully typed, no cast needed
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

const provider = new FlixProvider()
const omssid = parseOMSSId('tmdb:155')
const controller = new AbortController()

const meta = await resolver.resolve(omssid, {
    server,
    signal: controller.signal,
})

const safeMeta = meta.ok === true ? meta.value : undefined
if (safeMeta) {
    const resp = await provider.getSources({ omssId: omssid, meta: safeMeta })
    if (resp.ok === true) {
        console.log(resp.value)
    } else {
        throw resp.error
    }
} else {
    throw new Error('ohoh no data resolved')
}
