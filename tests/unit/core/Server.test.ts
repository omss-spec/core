import { describe, expect, it } from 'vitest'
import { OMSSServer } from '@/core/server.js'
import type { OMSSConfig } from '@/types/config.js'

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
        expect(server.getConfig()).toBe(baseConfig)
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

        it('throws when a decorator with the same name already exists', () => {
            const server = makeServer()
            server.decorate('cache', {})
            expect(() => server.decorate('cache', {})).toThrow('Decorator "cache" already exists')
        })

        it('throws when a named dependency is not yet registered', () => {
            const server = makeServer()
            expect(() => server.decorate('service', {}, ['missing'])).toThrow('"service" depends on "missing"')
        })

        it('succeeds when all named dependencies are already registered', () => {
            const server = makeServer()
            server.decorate('dep', true)
            expect(() => server.decorate('consumer', {}, ['dep'])).not.toThrow()
        })

        it('accepts multiple dependencies and resolves all of them', () => {
            const server = makeServer()
            server.decorate('a', 1)
            server.decorate('b', 2)
            expect(() => server.decorate('c', 3, ['a', 'b'])).not.toThrow()
        })

        it('throws on the first missing dependency when some deps are present', () => {
            const server = makeServer()
            server.decorate('present', true)
            expect(() => server.decorate('x', {}, ['present', 'absent'])).toThrow('"x" depends on "absent"')
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
            expect(server.getDecorator('redis')).toBe(payload)
        })

        it('throws when the requested decorator does not exist', () => {
            const server = makeServer()
            expect(() => server.getDecorator('ghost')).toThrow('Decorator "ghost" not found')
        })

        it('returns the correct value for each decorator when multiple are registered', () => {
            const server = makeServer()
            server.decorate('alpha', 1)
            server.decorate('beta', 2)
            expect(server.getDecorator('alpha')).toBe(1)
            expect(server.getDecorator('beta')).toBe(2)
        })

        it('infers the generic type parameter', () => {
            const server = makeServer()
            server.decorate('port', 3000)
            const port = server.getDecorator<number>('port')
            expect(typeof port).toBe('number')
            expect(port).toBe(3000)
        })
    })
})
