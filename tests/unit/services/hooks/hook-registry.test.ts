import { describe, it, expect, vi } from 'vitest'
import { HookRegistry } from '../../../../src/services/hooks/index.js'

type TestHooks = {
    onStart: (payload: { port: number }) => void
    onStop: (payload: { reason: string }) => Promise<void>
    onData: (payload: { bytes: number }) => void
}

describe('HookRegistry', () => {
    describe('add()', () => {
        it('registers a hook handler without throwing', () => {
            const registry = new HookRegistry<TestHooks>()
            expect(() => registry.add('onStart', vi.fn())).not.toThrow()
        })

        it('allows multiple handlers for the same hook', () => {
            const registry = new HookRegistry<TestHooks>()
            registry.add('onStart', vi.fn())
            registry.add('onStart', vi.fn())
            expect(true).toBe(true)
        })
    })

    describe('run()', () => {
        it('calls a synchronous handler with the correct payload', async () => {
            const registry = new HookRegistry<TestHooks>()
            const handler = vi.fn()
            registry.add('onStart', handler)
            await registry.run('onStart', { port: 3000 })
            expect(handler).toHaveBeenCalledOnce()
            expect(handler).toHaveBeenCalledWith({ port: 3000 })
        })

        it('calls all handlers in registration order', async () => {
            const registry = new HookRegistry<TestHooks>()
            const callOrder: number[] = []
            registry.add('onData', () => callOrder.push(1))
            registry.add('onData', () => callOrder.push(2))
            registry.add('onData', () => callOrder.push(3))
            await registry.run('onData', { bytes: 512 })
            expect(callOrder).toEqual([1, 2, 3])
        })

        it('awaits async handlers before continuing to next handler', async () => {
            const registry = new HookRegistry<TestHooks>()
            const sequence: string[] = []
            registry.add('onStop', async () => {
                await new Promise((r) => setTimeout(r, 10))
                sequence.push('first')
            })
            registry.add('onStop', async () => { sequence.push('second') })
            await registry.run('onStop', { reason: 'shutdown' })
            expect(sequence).toEqual(['first', 'second'])
        })

        it('does not call handlers registered for a different hook', async () => {
            const registry = new HookRegistry<TestHooks>()
            const onStart = vi.fn()
            const onStop = vi.fn()
            registry.add('onStart', onStart)
            registry.add('onStop', onStop)
            await registry.run('onStart', { port: 8080 })
            expect(onStart).toHaveBeenCalledOnce()
            expect(onStop).not.toHaveBeenCalled()
        })

        it('resolves without error when no handlers are registered', async () => {
            const registry = new HookRegistry<TestHooks>()
            await expect(registry.run('onStart', { port: 3000 })).resolves.toBeUndefined()
        })

        it('propagates errors thrown inside a handler', async () => {
            const registry = new HookRegistry<TestHooks>()
            registry.add('onStart', () => { throw new Error('hook failed') })
            await expect(registry.run('onStart', { port: 3000 })).rejects.toThrow('hook failed')
        })

        it('halts at a throwing handler — subsequent handlers are not called', async () => {
            const registry = new HookRegistry<TestHooks>()
            const after = vi.fn()
            registry.add('onStart', () => { throw new Error('boom') })
            registry.add('onStart', after)
            await expect(registry.run('onStart', { port: 3000 })).rejects.toThrow('boom')
            expect(after).not.toHaveBeenCalled()
        })
    })
})