import { describe, expect, it } from 'vitest'
import { parseOMSSId } from '@/features/resolvers/utils.js'

describe('features/resolvers/utils', () => {
    describe('parseOMSSId()', () => {
        it('parses a valid OMSS id', () => {
            expect(parseOMSSId('tmdb:123')).toEqual({
                namespace: 'tmdb',
                value: '123',
                raw: 'tmdb:123',
            })
        })

        it('keeps everything after the first colon as the value', () => {
            expect(parseOMSSId('imdb:tt:12345')).toEqual({
                namespace: 'imdb',
                value: 'tt:12345',
                raw: 'imdb:tt:12345',
            })
        })

        it('throws when the id has no colon', () => {
            expect(() => parseOMSSId('tmdb123')).toThrow()
        })

        it('throws when the namespace is empty', () => {
            expect(() => parseOMSSId(':123')).toThrow()
        })

        it('throws when the value is empty', () => {
            expect(() => parseOMSSId('tmdb:')).toThrow()
        })

        it('throws when both namespace and value are empty', () => {
            expect(() => parseOMSSId(':')).toThrow()
        })
    })
})
