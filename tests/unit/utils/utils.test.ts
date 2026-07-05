import { describe, expect, it } from 'vitest'
import { ERR, OK } from '@/utils/utils.js'

describe('utils/utils', () => {
    it('OK() returns a success result', () => {
        expect(OK('value')).toEqual({
            ok: true,
            value: 'value',
        })
    })

    it('OK() preserves object references', () => {
        const payload = { id: 1, title: 'Example Movie' }

        const result = OK(payload)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBe(payload)
        }
    })

    it('ERR() returns a failure result', () => {
        const error = new Error('boom')

        expect(ERR(error)).toEqual({
            ok: false,
            error,
        })
    })

    it('ERR() preserves the original error instance', () => {
        const error = new TypeError('bad input')

        const result = ERR(error)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBe(error)
            expect(result.error).toBeInstanceOf(TypeError)
            expect(result.error.message).toBe('bad input')
        }
    })
})
