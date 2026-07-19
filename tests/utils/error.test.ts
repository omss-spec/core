import { describe, it, expect } from 'vitest'
import { OMSSError, OMSSServerError, OMSSPluginError, OMSSResolverError, OMSSProviderError, OMSSSourceGatheringError } from '@/utils/error.js'

describe('OMSSError', () => {
    it('sets name to subclass constructor name and preserves message', () => {
        const error = new OMSSError('base message')

        expect(error.name).toBe('OMSSError')
        expect(error.message).toBe('base message')
    })

    it('accepts optional cause object', () => {
        const cause = { detail: 'something' }
        const error = new OMSSError('with cause', { cause })

        expect(error.cause).toBe(cause)
    })
})

describe('OMSSServerError', () => {
    it('is an OMSSError subclass and carries message', () => {
        const error = new OMSSServerError('server error', { cause: { foo: 'bar' } })

        expect(error).toBeInstanceOf(OMSSError)
        expect(error.name).toBe('OMSSServerError')
        expect(error.message).toBe('server error')
        expect(error.cause).toEqual({ foo: 'bar' })
    })
})

describe('OMSSPluginError', () => {
    it('is an OMSSError subclass and carries message', () => {
        const error = new OMSSPluginError('plugin error')

        expect(error).toBeInstanceOf(OMSSError)
        expect(error.name).toBe('OMSSPluginError')
        expect(error.message).toBe('plugin error')
    })
})

describe('OMSSResolverError', () => {
    it('is an OMSSError subclass and carries message', () => {
        const error = new OMSSResolverError('resolver error')

        expect(error).toBeInstanceOf(OMSSError)
        expect(error.name).toBe('OMSSResolverError')
        expect(error.message).toBe('resolver error')
    })
})

describe('OMSSProviderError', () => {
    it('is an OMSSError subclass and carries message', () => {
        const error = new OMSSProviderError('provider error')

        expect(error).toBeInstanceOf(OMSSError)
        expect(error.name).toBe('OMSSProviderError')
        expect(error.message).toBe('provider error')
    })
})

describe('OMSSSourceGatheringError', () => {
    it('is an OMSSError subclass and carries message', () => {
        const error = new OMSSSourceGatheringError('source gathering error')

        expect(error).toBeInstanceOf(OMSSError)
        expect(error.name).toBe('OMSSSourceGatheringError')
        expect(error.message).toBe('source gathering error')
    })
})
