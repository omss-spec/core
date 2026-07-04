import {
    BaseProvider,
    BaseResolver,
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

// This file exists purely to test out the exported components from the package.
// to use it, import all components from '../src/index.js'
// to run this file, run 'npm run example'

const server = new OMSSServer({ name: 'example' })
// test things out with server
// server.decorate('test', 'test', ['test'])
// console.log(server['test'])
// const josh = server.getDecorator<string>('test') // should return 'test'

interface TMDBMedia {
    id: number
    title: string
}

interface fakemovie {
    id: number
}

class TMDBResolver extends BaseResolver<TMDBMedia> {
    namespace = 'tmdb'
    name = 'TMDB'

    async resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMedia>> {
        const data = (await new Promise((resolve) => {
            // Simulate an API call to TMDB
            setTimeout(() => {
                resolve(OK({ id: parseInt(id.value), title: 'Example Movie' }))
            }, 1000)
        })) as ResolverResult<TMDBMedia>
        if (!data.ok) {
            return data
        }
        throw new OMSSResolverError('Failed to resolve media')
    }
}

const resolver = new TMDBResolver()

class FlixProvider extends BaseProvider<typeof resolver> {
    readonly baseUrl = 'https://example.com/api/v1/'
    readonly enabled = true

    readonly headers = {
        'Content-Type': 'application/json',
    }
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly resolver = resolver

    async getSources(media: ProviderSourcesMeta<ResolverMetadata<typeof resolver>>): Promise<ProviderResult> {
        console.log(media)
        return await new Promise((resolve) => {
            setTimeout(() => {
                resolve(OK({ sources: ['josh'] }))
            }, 1000)
        })
    }
}
