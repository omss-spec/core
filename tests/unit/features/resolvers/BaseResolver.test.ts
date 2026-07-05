import { describe, expect, expectTypeOf, it } from 'vitest'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { ParsedOMSSId, ResolverExecutionContext, ResolverResult } from '@/types/resolver.js'
import { OK } from '@/utils/utils.js'
import OMSSServer from '@/core/server.js'

interface ResolverMeta {
    id: number
    title: string
    kind: 'movie'
}

class MovieResolver extends BaseResolver<ResolverMeta> {
    namespace = 'tmdb'
    name = 'TMDB Resolver'

    async resolve(id: ParsedOMSSId, _ctx: ResolverExecutionContext): Promise<ResolverResult<ResolverMeta>> {
        return OK({
            id: Number(id.value),
            title: 'Interstellar',
            kind: 'movie',
        })
    }
}

describe('BaseResolver', () => {
    it('exposes namespace and name', () => {
        const resolver = new MovieResolver()

        expect(resolver.namespace).toBe('tmdb')
        expect(resolver.name).toBe('TMDB Resolver')
    })

    it('returns typed resolver metadata', async () => {
        const resolver = new MovieResolver()
        const server = new OMSSServer({ name: 'test' })

        const result = await resolver.resolve({ namespace: 'tmdb', value: '42', raw: 'tmdb:42' }, { server, signal: new AbortController().signal })

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual({
                id: 42,
                title: 'Interstellar',
                kind: 'movie',
            })
        }
    })

    it('keeps the resolve return type aligned with ResolverResult<T>', () => {
        const resolver = new MovieResolver()
        expectTypeOf<ReturnType<typeof resolver.resolve>>().toEqualTypeOf<Promise<ResolverResult<ResolverMeta>>>()
    })
})
