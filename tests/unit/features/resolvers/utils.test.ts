import { describe, expect, it } from 'vitest'
import { parseOMSSId } from '@/features/resolvers/utils.js'
import { OK } from '@/utils/utils.js'

describe('features/resolvers/utils', () => {
    describe('parseOMSSId()', () => {
        it('parses a valid OMSS id', () => {
            const parsed = parseOMSSId('tmdb:123')
            expect(parsed.ok).toBe(true)
            expect(parsed).toEqual(
                OK({
                    namespace: 'tmdb',
                    value: '123',
                    raw: 'tmdb:123',
                })
            )
        })

        it('keeps everything after the first colon as the value', () => {
            const parsed = parseOMSSId('imdb:tt:12345')
            expect(parsed.ok).toBe(true)
            expect(parsed).toEqual(
                OK({
                    namespace: 'imdb',
                    value: 'tt:12345',
                    raw: 'imdb:tt:12345',
                })
            )
        })

        it('returns ERR when the id has no colon', () => {
            const par = parseOMSSId('tmdb123')
            expect(par.ok).toBe(false)
        })

        it('returns ERR when the namespace is empty', () => {
            const par = parseOMSSId(':123')
            expect(par.ok).toBe(false)
        })

        it('returns ERR when the value is empty', () => {
            const par = parseOMSSId('tmdb:')
            expect(par.ok).toBe(false)
        })

        it('returns ERR when both namespace and value are empty', () => {
            const par = parseOMSSId(':')
            expect(par.ok).toBe(false)
        })
    })
})
