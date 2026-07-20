import { describe, expect, it } from 'vitest'
import { OMSSResolverError } from '@/utils/error.js'
import { parseOMSSId } from '@/features/resolvers/utils.js'

describe('parseOMSSId', () => {
    describe('successful parsing', () => {
        it('parses a basic OMSS ID', () => {
            const result = parseOMSSId('tmdb:123')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value).toEqual({
                namespace: 'tmdb',
                values: ['123'],
                raw: 'tmdb:123',
            })
        })

        it('parses multiple values', () => {
            const result = parseOMSSId('tmdb:movie:123')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.namespace).toBe('tmdb')
            expect(result.value.values).toEqual(['movie', '123'])
            expect(result.value.raw).toBe('tmdb:movie:123')
        })

        it('parses many values', () => {
            const result = parseOMSSId('ns:a:b:c:d:e:f')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
        })

        it('decodes URL-encoded values', () => {
            const result = parseOMSSId('tmdb:hello%20world:movie%2F123')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values).toEqual(['hello world', 'movie/123'])
        })

        it('decodes encoded colons inside values', () => {
            const result = parseOMSSId('ns:hello%3Aworld')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values).toEqual(['hello:world'])
        })

        it('supports unicode values', () => {
            const result = parseOMSSId('ns:%F0%9F%98%80')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values).toEqual(['😀'])
        })

        it('preserves the raw ID', () => {
            const raw = 'tmdb:test%20value'

            const result = parseOMSSId(raw)

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.raw).toBe(raw)
        })

        it('does not decode the namespace', () => {
            const result = parseOMSSId('abc-123:test')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.namespace).toBe('abc-123')
        })

        it('supports very long values', () => {
            const value = 'a'.repeat(5000)

            const result = parseOMSSId(`tmdb:${value}`)

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values[0]).toBe(value)
        })
    })

    describe('whitespace validation', () => {
        it.each(['tmdb:hello world', 'tmdb: hello', 'tmdb:hello ', ' tmdb:hello', 'tmdb:\thello', 'tmdb:\nhello', 'tmdb:\rhello', 'tmdb:\fhello', 'tmdb:\vhello'])('rejects whitespace: %s', (id) => {
            const result = parseOMSSId(id)

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error).toBeInstanceOf(OMSSResolverError)
            expect(result.error.message).toContain('cannot contain whitespace')
        })
    })

    describe('namespace separator validation', () => {
        it.each(['', 'tmdb', 'abc', 'movie123'])('rejects IDs without ":" (%s)', (id) => {
            const result = parseOMSSId(id)

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error.message).toContain('missing namespace separator')
        })
    })

    describe('namespace validation', () => {
        it('rejects empty namespace', () => {
            const result = parseOMSSId(':123')

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error.message).toContain('namespace cannot be empty')
        })

        it.each(['TMDB', 'Tmdb', 'tm_db', 'tm.db', 'tm$db', 'tm/db', 'tm@db', 'äbc', '🔥', 'abc!'])('rejects invalid namespace "%s"', (namespace) => {
            const result = parseOMSSId(`${namespace}:123`)

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error).toBeInstanceOf(OMSSResolverError)
            expect(result.error.message).toContain(`Invalid OMSS namespace "${namespace}"`)
        })

        it.each(['a', 'abc', 'tmdb', 'abc-123', '123', 'a-b-c'])('accepts namespace "%s"', (namespace) => {
            const result = parseOMSSId(`${namespace}:value`)

            expect(result.ok).toBe(true)
        })
    })

    describe('value validation', () => {
        it('rejects an empty first value', () => {
            const result = parseOMSSId('tmdb:')

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error.message).toContain('value 1 cannot be empty')
        })

        it('rejects empty middle value', () => {
            const result = parseOMSSId('tmdb:movie::123')

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error.message).toContain('value 2 cannot be empty')
        })

        it('rejects empty last value', () => {
            const result = parseOMSSId('tmdb:movie:123:')

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error.message).toContain('value 3 cannot be empty')
        })

        it('rejects consecutive empty values', () => {
            const result = parseOMSSId('tmdb:a:::b')

            expect(result.ok).toBe(false)

            if (result.ok) return

            expect(result.error.message).toContain('value 2 cannot be empty')
        })
    })

    describe('URL decoding', () => {
        it('decodes reserved characters', () => {
            const result = parseOMSSId('ns:%2F%3F%23%5B%5D%40')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values).toEqual(['/?#[]@'])
        })

        it('decodes values independently', () => {
            const result = parseOMSSId('ns:hello%20world:test%2Fmovie')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(result.value.values).toEqual(['hello world', 'test/movie'])
        })

        it('throws on malformed URI encoding', () => {
            expect(() => parseOMSSId('tmdb:%')).toThrow(URIError)
        })

        it('throws on incomplete percent encoding', () => {
            expect(() => parseOMSSId('tmdb:%A')).toThrow(URIError)
        })
    })

    describe('result contract', () => {
        it('returns an OK result on success', () => {
            const result = parseOMSSId('tmdb:123')

            expect(result.ok).toBe(true)
        })

        it('returns an ERR result on failure', () => {
            const result = parseOMSSId('tmdb:')

            expect(result.ok).toBe(false)

            if (!result.ok) expect(result.error).toBeInstanceOf(OMSSResolverError)
        })

        it('returns ParsedOMSSId shape', () => {
            const result = parseOMSSId('abc:test')

            expect(result.ok).toBe(true)

            if (!result.ok) return

            expect(typeof result.value.namespace).toBe('string')
            expect(Array.isArray(result.value.values)).toBe(true)
            expect(typeof result.value.raw).toBe('string')
        })
    })
})
