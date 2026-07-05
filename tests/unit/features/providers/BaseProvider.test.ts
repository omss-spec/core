import { describe, expect, expectTypeOf, it } from 'vitest'
import { BaseProvider } from '@/features/providers/BaseProvider.js'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'
import type { ProviderResult, ProviderSourcesMeta, ResolverMetadata } from '@/types/provider.js'
import { OK } from '@/utils/utils.js'
import OMSSServer from '@/core/server.js'

interface MovieMeta {
    id: number
    title: string
}

class TestResolver extends BaseResolver<MovieMeta> {
    namespace = 'tmdb'
    name = 'TMDB'

    async resolve(id: ParsedOMSSId, _ctx: ResolverExecutionContext): Promise<ResolverResult<MovieMeta>> {
        return OK({
            id: Number(id.value),
            title: 'Example Movie',
        })
    }
}

const resolver = new TestResolver()

class TestProvider extends BaseProvider<typeof resolver> {
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly enabled = true
    readonly baseUrl = 'https://example.com'
    readonly headers = { Authorization: 'Bearer test' }
    readonly supportedIds = ['*']
    readonly resolver = resolver

    async getSources(media: ProviderSourcesMeta<ResolverMetadata<typeof resolver>>): Promise<ProviderResult> {
        return OK({
            sources: [`${media.meta.title}:${media.meta.id}`],
        })
    }
}

describe('BaseProvider', () => {
    it('binds getSources meta to the resolver metadata type', () => {
        type Meta = ResolverMetadata<typeof resolver>
        expectTypeOf<Meta>().toEqualTypeOf<MovieMeta>()
        expectTypeOf<Parameters<TestProvider['getSources']>[0]['meta']>().toEqualTypeOf<MovieMeta>()
    })

    it('exposes resolver-backed provider properties', () => {
        const provider = new TestProvider()

        expect(provider.id).toBe('flix')
        expect(provider.name).toBe('Flix')
        expect(provider.enabled).toBe(true)
        expect(provider.baseUrl).toBe('https://example.com')
        expect(provider.headers.Authorization).toBe('Bearer test')
        expect(provider.resolver).toBe(resolver)
    })

    it('returns sources using resolver-derived meta', async () => {
        const provider = new TestProvider()

        const result = await provider.getSources({
            omssId: {
                namespace: 'tmdb',
                value: '123',
                raw: 'tmdb:123',
            },
            meta: {
                id: 123,
                title: 'Example Movie',
            },
        })

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.sources).toEqual(['Example Movie:123'])
        }
    })

    it('works end-to-end with resolved metadata', async () => {
        const provider = new TestProvider()
        const server = new OMSSServer({ name: 'test' })

        const resolved = await resolver.resolve({ namespace: 'tmdb', value: '77', raw: 'tmdb:77' }, { server, signal: new AbortController().signal })

        expect(resolved.ok).toBe(true)
        if (!resolved.ok) return

        const sources = await provider.getSources({
            omssId: { namespace: 'tmdb', value: '77', raw: 'tmdb:77' },
            meta: resolved.value,
        })

        expect(sources.ok).toBe(true)
        if (sources.ok) {
            expect(sources.value.sources).toEqual(['Example Movie:77'])
        }
    })
})
