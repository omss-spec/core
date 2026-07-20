import { OMSSConfig, OMSSServer } from '../src/index.js'

const config: OMSSConfig = { name: 'omss-example' }
const server = new OMSSServer(config)
// now you can do cool things with this server instance!
server.config
/*
type TMDBMeta = {
    id: number
    name: string
}

class TMDBResolver extends BaseResolver<TMDBMeta> {
    converter: Map<string, (noHandlerId: OMSSId, ctx: ResolverExecutionContext) => Promise<Result<OMSSId, OMSSResolverError>>>
    name: string
    namespace: string

    resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMeta>> {
        return Promise.resolve(undefined)
    }

    resolve(id: ParsedOMSSId, ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMeta>> {
        return Promise.resolve(undefined)
    }
}

const t = new TMDBResolver()

class MyProvider extends BaseProvider<typeof t> {
    readonly enabled = true
    readonly id = 'unique-id'
    readonly name = 'My Provider'
    readonly resolver = t

    readonly catalog = (): Promise<NonEmptyArray<string>> | NonEmptyArray<string> => {
        return ['*']
    }

    async getSources(request: ProviderSourcesMeta<ResolverMetadata<typeof t>>, result: ProviderResultEmitter): Promise<ProviderResult> {
        const req = await request.utils.findExtractor('https:////baguette.fr')
        if (req.ok) {
            const newstuff = await req.value.parse('http://localhost:8080', { referrer: 'https://2123.3', header: {} })
        }
    }

    readonly supportsId = (id: ParsedOMSSId): boolean | Promise<boolean> => true
}
*/
