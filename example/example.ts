import { OMSSResolver, OMSSResolverResult, OMSSServer, ParsedOMSSId, parseOMSSId, ResolverExecutionContext } from '../src/index.js'

interface TMDBMetadata {
    tmdbId: number
    title: string
    type: 'movie' | 'tv'
    year: number
}

export const tmdbResolver: OMSSResolver<TMDBMetadata> = {
    namespace: 'tmdb',
    name: 'Mock TMDB Resolver',

    async resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<OMSSResolverResult<TMDBMetadata>> {
        // Respect cancellation
        if (ctx.signal.aborted) {
            throw new Error('Resolution aborted')
        }

        return {
            metadata: {
                tmdbId: Number(id.value),
                title: 'The Shawshank Redemption',
                type: 'movie',
                year: 1994,
            },
        }
    },
}

class MockFastify {
    readonly config: any = {}

    constructor(config: any) {
        this.config = config
    }
    start() {
        console.log(this.config)
    }
}

const httpPlugin = async (server: OMSSServer, options: any) => {
    server.decorate('app', new MockFastify(options))
}

const server = new OMSSServer({ name: 'Local testing server' })

await server.plugins.register(httpPlugin, { port: 3000 })
await server.resolvers.register(tmdbResolver)
const parsed = parseOMSSId('tmdb:_asdf')

server.resolvers.getByNamespace(parsed.namespace).forEach(async (resolver) => {
    const resp = await resolver.resolve(parsed, { server, signal: new AbortController().signal })
    console.log(resp)
})

server.app.start()

declare module '../src/index.js' {
    interface OMSSServer {
        app: MockFastify
    }
}
