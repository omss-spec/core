import { describe, expect, it } from 'vitest'
import { OMSSServer } from '@/core/server.js'
import type { OMSSConfig } from '@/types/config.js'
import { OK } from '@/utils/utils.js'

const baseConfig: OMSSConfig = {
    name: 'test-server',
} as OMSSConfig

function makeServer(): OMSSServer {
    return new OMSSServer(baseConfig)
}

describe('OMSSServer', () => {
    it('exposes a hooks service', () => {
        const server = makeServer()
        expect(server.hooks).toBeDefined()
    })

    it('exposes a plugins service', () => {
        const server = makeServer()
        expect(server.plugins).toBeDefined()
    })

    it('returns the config passed to the constructor', () => {
        const server = makeServer()
        expect(server.config).toBe(baseConfig)
    })

    describe('decorate()', () => {
        it('adds a new property to the server instance', () => {
            const server = makeServer()
            server.decorate('db', { client: 'pg' })
            expect((server as any).db).toEqual({ client: 'pg' })
        })

        it('makes the decorated property enumerable', () => {
            const server = makeServer()
            server.decorate('myProp', 42)
            expect(Object.keys(server)).toContain('myProp')
        })

        it('makes the decorated property non-writable', () => {
            const server = makeServer()
            server.decorate('immutable', 'hello')
            expect(() => {
                ;(server as any).immutable = 'world'
            }).toThrow()
        })

        it('returns ERR when a decorator with the same name already exists', () => {
            const server = makeServer()
            const first = server.decorate('cache', {})
            expect(first.ok).toBe(true)
            const res = server.decorate('cache', {})
            expect(res.ok).toBe(false)
            if (!res.ok) expect(res.error.message).toBe('Decorator "cache" already exists')
        })

        it('returns ERR when a named dependency is not yet registered', () => {
            const server = makeServer()
            const res = server.decorate('service', {}, ['missing'])
            expect(res.ok).toBe(false)
            if (!res.ok) expect(res.error.message).toBe('"service" depends on "missing", which does not exist')
        })

        it('succeeds when all named dependencies are already registered', () => {
            const server = makeServer()
            server.decorate('dep', true)
            const res = server.decorate('consumer', {}, ['dep'])
            expect(res.ok).toBe(true)
        })

        it('accepts multiple dependencies and resolves all of them', () => {
            const server = makeServer()
            server.decorate('a', 1)
            server.decorate('b', 2)
            const res = server.decorate('c', 3, ['a', 'b'])
            expect(res.ok).toBe(true)
        })

        it('returns ERR on the first missing dependency when some deps are present', () => {
            const server = makeServer()
            server.decorate('present', true)
            const res = server.decorate('x', {}, ['present', 'absent'])
            expect(res.ok).toBe(false)
        })

        it('allows decorating with different value types', () => {
            const server = makeServer()
            const fn = () => 'result'
            server.decorate('fn', fn)
            expect((server as any).fn).toBe(fn)
        })
    })

    describe('hasDecorator()', () => {
        it('returns false for a name that has never been registered', () => {
            const server = makeServer()
            expect(server.hasDecorator('unknown')).toBe(false)
        })

        it('returns true after a decorator is registered', () => {
            const server = makeServer()
            server.decorate('myDep', 'value')
            expect(server.hasDecorator('myDep')).toBe(true)
        })

        it('returns false for built-in non-own properties (prototype methods)', () => {
            const server = makeServer()
            // toString exists on the prototype, not as own property
            expect(server.hasDecorator('toString')).toBe(false)
        })
    })

    describe('getDecorator()', () => {
        it('retrieves the value that was decorated', () => {
            const server = makeServer()
            const payload = { connected: true }
            server.decorate('redis', payload)
            const result = server.getDecorator<typeof payload>('redis')
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value).toBe(payload)
        })

        it('returns ERR when the requested decorator does not exist', () => {
            const server = makeServer()
            expect((server as any)['ghost']).toBe(undefined)
            const res = server.getDecorator('ghost')
            expect(res.ok).toBe(false)
            if (!res.ok) expect(res.error.message).toBe('Decorator "ghost" not found')
        })

        it('returns the correct value for each decorator when multiple are registered', () => {
            const server = makeServer()
            const num = 1
            const num2 = 2
            server.decorate('alpha', num)
            server.decorate('beta', num2)
            const res = server.getDecorator<typeof num>('alpha')
            expect(res.ok).toBe(true)
            if (res.ok) expect(res.value).toBe(num)
            expect(server.getDecorator<typeof num>('alpha')).toStrictEqual(OK(1))
            const res2 = server.getDecorator<typeof num2>('beta')
            expect(res2.ok).toBe(true)
            if (res2.ok) expect(res2.value).toBe(num2)
            expect(server.getDecorator<typeof num2>('beta')).toStrictEqual(OK(2))
        })

        it('infers the generic type parameter', () => {
            const server = makeServer()
            const val = 3000
            server.decorate('port', val)
            const res = server.getDecorator<number>('port')
            expect(res.ok).toBe(true)
            if (res.ok) expect(res.value).toBe(val)
            expect(res).toStrictEqual(OK(val))
            if (res.ok) expect(typeof res.value).toBe('number')
        })
    })
})
