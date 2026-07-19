import { describe, it, expect } from 'vitest'
import OMSSServer from '@/core/server.js'
import { OMSSServerError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'

const createConfig = (overrides: Partial<OMSSConfig> = {}): OMSSConfig => ({
    name: 'test-server',
    ...overrides,
} as OMSSConfig)

describe('OMSSServer', () => {
    describe('constructor', () => {
        it('initializes core services and stores immutable config', () => {
            const config = createConfig()

            const server = new OMSSServer(config)

            expect(server.config).toBe(config)
            expect(Object.isFrozen(server.config)).toBe(false)

            expect(server.hooks).toBeDefined()
            expect(server.plugins).toBeDefined()
            expect(server.providers).toBeDefined()
            expect(server.sources).toBeDefined()
        })
    })

    describe('config getter', () => {
        it('returns the same config instance that was passed to the constructor', () => {
            const config = createConfig({ name: 'another-server' })
            const server = new OMSSServer(config)

            expect(server.config).toBe(config)
        })
    })

    describe('decorate', () => {
        it('adds a new readonly, enumerable property and returns OK result', () => {
            const config = createConfig()
            const server = new OMSSServer(config)
            const value = { foo: 'bar' }

            const result = server.decorate('myDecorator', value)

            expect(result.ok).toBe(true)
            expect(result.value).toBe('myDecorator')

            const descriptor = Object.getOwnPropertyDescriptor(server, 'myDecorator')
            expect(descriptor).toBeDefined()
            expect(descriptor?.value).toBe(value)
            expect(descriptor?.writable).toBe(false)
            expect(descriptor?.configurable).toBe(false)
            expect(descriptor?.enumerable).toBe(true)
        })

        it('returns error when decorator already exists', () => {
            const config = createConfig()
            const server = new OMSSServer(config)

            const first = server.decorate('existing', 123)
            expect(first.ok).toBe(true)

            const second = server.decorate('existing', 456)
            expect(second.ok).toBe(false)
            expect(second.error).toBeInstanceOf(OMSSServerError)
            expect(second.error.message).toContain('Decorator "existing" already exists')
            expect((second.error as OMSSServerError).cause).toBeDefined()
        })

        it('returns error when dependencies are missing', () => {
            const config = createConfig()
            const server = new OMSSServer(config)

            const result = server.decorate('withDeps', 1, ['missingDep'])

            expect(result.ok).toBe(false)
            expect(result.error).toBeInstanceOf(OMSSServerError)
            expect(result.error.message).toContain('depends on "missingDep"')
        })

        it('succeeds when all dependencies exist', () => {
            const config = createConfig()
            const server = new OMSSServer(config)

            const depResult = server.decorate('dep', 1)
            expect(depResult.ok).toBe(true)

            const result = server.decorate('withDeps', 2, ['dep'])
            expect(result.ok).toBe(true)
            expect(result.value).toBe('withDeps')
        })
    })

    describe('hasDecorator', () => {
        it('returns true when decorator exists', () => {
            const server = new OMSSServer(createConfig())
            server.decorate('decorated', 42)

            expect(server.hasDecorator('decorated')).toBe(true)
        })

        it('returns false when decorator does not exist', () => {
            const server = new OMSSServer(createConfig())

            expect(server.hasDecorator('missing')).toBe(false)
        })
    })

    describe('getDecorator', () => {
        it('returns OK result with value when decorator exists', () => {
            const server = new OMSSServer(createConfig())
            const value = { foo: 'bar' }
            server.decorate('decorated', value)

            const result = server.getDecorator<typeof value>('decorated')

            expect(result.ok).toBe(true)
            expect(result.value).toBe(value)
        })

        it('returns error when decorator does not exist', () => {
            const server = new OMSSServer(createConfig())

            const result = server.getDecorator('missing')

            expect(result.ok).toBe(false)
            expect(result.error).toBeInstanceOf(OMSSServerError)
            expect(result.error.message).toContain('Decorator "missing" not found')
        })
    })
})
