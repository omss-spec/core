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

export interface TMDBMedia {
    id: number
    title: string
}

class TMDBResolver extends BaseResolver<TMDBMedia> {
    namespace = 'tmdb'
    name = 'TMDB'
    cacheTTL: number

    constructor(cacheTTL?: number) {
        super()
        this.cacheTTL = cacheTTL ?? 60_000
    }

    async resolve(id: ParsedOMSSId, _ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMedia>> {
        try {
            const media = await new Promise<TMDBMedia>((resolve) => {
                setTimeout(() => {
                    resolve({ id: parseInt(id.value, 10), title: 'Example Movie' })
                }, 1000)
            })

            return OK(media)
        } catch {
            return ERR(new OMSSResolverError('Failed to resolve media'))
        }
    }
}

export const resolver = new TMDBResolver(3000)

class FlixProvider extends BaseProvider<typeof resolver> {
    readonly enabled = true
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly resolver = resolver

    readonly supportsId = (_id: ParsedOMSSId) => true

    async getSources(media: ProviderSourcesMeta<ResolverMetadata<typeof resolver>>): Promise<ProviderResult> {
        console.log(`Fetching sources for: ${media.meta.title} (id: ${media.meta.id})`)

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(OK({ sources: ['https://example.com/stream/1.m3u8'] }))
            }, 1000)
        })
    }
}

type SourceCachePluginOptions = {
    ttlMs?: number
}

/**
 * Small source-cache plugin that caches successful getSources results.
 */
function sourceCachePlugin(options: SourceCachePluginOptions) {
    const ttlMs = options.ttlMs ?? 30_000

    return async (server: OMSSServer) => {
        const cache = new Map<
            string,
            {
                expiresAt: number
                value: any
            }
        >()

        server.sources.use('getSources', async (context, next) => {
            const providerId = context.options.providerId
            const cacheKey = `${context.omssId}|${providerId ?? ''}`
            const now = Date.now()

            const cached = cache.get(cacheKey)

            if (cached && cached.expiresAt > now) {
                return cached.value
            }

            if (cached) {
                cache.delete(cacheKey)
            }

            const result = await next()

            if (result.ok) {
                cache.set(cacheKey, {
                    expiresAt: now + ttlMs,
                    value: result,
                })
            }

            return result
        })
    }
}

const server = new OMSSServer({ name: 'example' })

server.plugins.register(sourceCachePlugin({ ttlMs: 10_000 }))

const providerRegistration = await server.providers.register(new FlixProvider())
console.assert(providerRegistration.ok === true, 'Provider registration failed')

const first = await server.sources.getSources('tmd b:123')

console.log(first)
