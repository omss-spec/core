import { describe, expect, expectTypeOf, it } from 'vitest'
import OMSSServer from '@/core/server.js'
import { BaseProvider } from '@/features/providers/BaseProvider.js'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'
import type { ProviderResult, ProviderSourcesMeta, ResolverMetadata } from '@/types/provider.js'
import { OK } from '@/utils/utils.js'

interface TMDBMedia {
    id: number
    title: string
}

class TMDBResolver extends BaseResolver<TMDBMedia> {
    namespace = 'tmdb'
    name = 'TMDB'

    async resolve(id: ParsedOMSSId, _ctx: ResolverExecutionContext): Promise<ResolverResult<TMDBMedia>> {
        return OK({
            id: Number(id.value),
            title: 'Example Movie',
        })
    }
}

const resolver = new TMDBResolver()

class FlixProvider extends BaseProvider<typeof resolver> {
    readonly id = 'flix'
    readonly name = 'Flix'
    readonly enabled = true
    readonly baseUrl = 'https://example.com/api/v1'
    readonly headers = { 'Content-Type': 'application/json' }
    readonly resolver = resolver
    readonly supportedIds = ['*']

    async getSources(media: ProviderSourcesMeta<ResolverMetadata<typeof resolver>>): Promise<ProviderResult> {
        return OK({
            sources: [`stream:${media.meta.id}:${media.meta.title}`],
        })
    }
}

describe('Provider/Resolver integration', () => {
    it('maps resolver output into provider input', async () => {
        const server = new OMSSServer({ name: 'integration' })
        const provider = new FlixProvider()

        const resolved = await resolver.resolve({ namespace: 'tmdb', value: '501', raw: 'tmdb:501' }, { server, signal: new AbortController().signal })

        expect(resolved.ok).toBe(true)
        if (!resolved.ok) return

        const result = await provider.getSources({
            omssId: { namespace: 'tmdb', value: '501', raw: 'tmdb:501' },
            meta: resolved.value,
        })

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.sources).toEqual(['stream:501:Example Movie'])
        }
    })

    it('infers provider meta from the resolver generic', () => {
        expectTypeOf<ResolverMetadata<typeof resolver>>().toEqualTypeOf<TMDBMedia>()
        expectTypeOf<Parameters<FlixProvider['getSources']>[0]['meta']>().toEqualTypeOf<TMDBMedia>()
    })
})
