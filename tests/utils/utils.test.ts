import { describe, expect, it } from 'vitest'
import { ERR, OK, validateSafeUniqueString } from '@/utils/utils.js'
import { SAFE_UNIQUE_STRING } from '@/utils/regexp.js'
import { OMSSError, OMSSServerError } from '@/utils/error.js'

describe('OK', () => {
    it('returns ok true without value when called without arguments', () => {
        const result = OK()

        expect(result).toEqual({ ok: true })
    })

    it('returns ok true with value when called with argument', () => {
        const value = 123

        const result = OK(value)

        expect(result).toEqual({ ok: true, value })
    })
})

describe('ERR', () => {
    it('wraps an error instance in a failed Result', () => {
        const error = new Error('test error')

        const result = ERR(error)

        expect(result.ok).toBe(false)
        expect(result.error).toBe(error)
    })
})

describe('validateSafeUniqueString', () => {
    const assertOk = (value: string) => {
        const result = validateSafeUniqueString(value, 'identifier', OMSSServerError)

        expect(result.ok).toBe(true)
    }

    const assertErr = (value: string) => {
        const result = validateSafeUniqueString(value, 'identifier', OMSSServerError)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSError)
            expect(result.error.message).toBe(`Invalid identifier "${value}". Expected only letters (lowercase), numbers, and hyphens.`)
        }
    }

    it('uses SAFE_UNIQUE_STRING regex for validation', () => {
        expect(SAFE_UNIQUE_STRING.test('valid-id-123')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('0-test')).toBe(true)
        expect(SAFE_UNIQUE_STRING.test('')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('INVALID')).toBe(false)
        expect(SAFE_UNIQUE_STRING.test('with space')).toBe(false)
    })

    it('returns OK for valid identifiers', () => {
        assertOk('a')
        assertOk('abc')
        assertOk('123')
        assertOk('abc-123')
        assertOk('a1-b2-c3')
        assertOk('0-test-9')
    })

    it('returns ERR for invalid identifiers', () => {
        assertErr('')
        assertErr('ABC')
        assertErr('Abc')
        assertErr('with space')
        assertErr(' leading')
        assertErr('trailing ')
        assertErr('line\nbreak')
        assertErr('tab\tcharacter')
        assertErr('under_score')
        assertErr('dot.name')
        assertErr('slash/name')
        assertErr('colon:name')
        assertErr('invalid!')
        assertErr('😀')
        assertErr('äbc')
    })
})
