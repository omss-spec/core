import { describe, expect, it, vi } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'

describe('HookRegistry', () => {
    it('initialises with an empty hooks Map', () => {
        const registry = new HookRegistry()
        expect(registry.#hooks.size).toBe(0)
    })

    describe('run()', () => {
        it('does nothing when no handlers are registered for a hook', async () => {
            const registry = new HookRegistry()
            await expect(registry.run('onError', { error: new Error('test') })).resolves.toBeUndefined()
        })

        it('calls a single registered handler with the correct payload', async () => {
            const registry = new HookRegistry()
            const handler = vi.fn()
            registry.#hooks.set('onError', [handler])

            const payload = { error: new Error('boom') }
            await registry.run('onError', payload)

            expect(handler).toHaveBeenCalledOnce()
            expect(handler).toHaveBeenCalledWith(payload)
        })

        it('calls multiple handlers in registration order', async () => {
            const registry = new HookRegistry()
            const order: number[] = []
            const h1 = vi.fn(() => {
                order.push(1)
            })
            const h2 = vi.fn(() => {
                order.push(2)
            })
            const h3 = vi.fn(() => {
                order.push(3)
            })
            registry.#hooks.set('onError', [h1, h2, h3])

            await registry.run('onError', { error: new Error('e') })

            expect(order).toEqual([1, 2, 3])
        })

        it('awaits async handlers before proceeding to the next', async () => {
            const registry = new HookRegistry()
            const resolved: string[] = []

            const asyncH1 = vi.fn(async () => {
                await new Promise((r) => setTimeout(r, 10))
                resolved.push('h1')
            })
            const asyncH2 = vi.fn(async () => {
                resolved.push('h2')
            })

            registry.#hooks.set('onError', [asyncH1, asyncH2])
            await registry.run('onError', { error: new Error('e') })

            expect(resolved).toEqual(['h1', 'h2'])
        })

        it('handles the onPluginRegister hook payload correctly', async () => {
            const registry = new HookRegistry()
            const handler = vi.fn()
            registry.#hooks.set('onPluginRegister', [handler])

            const plugin = async () => {}
            const payload = { plugin, options: undefined }
            await registry.run('onPluginRegister', payload)

            expect(handler).toHaveBeenCalledWith(payload)
        })

        it('propagates errors thrown by a handler', async () => {
            const registry = new HookRegistry()
            registry.#hooks.set('onError', [
                vi.fn(() => {
                    throw new Error('handler error')
                }),
            ])

            await expect(registry.run('onError', { error: new Error('original') })).rejects.toThrow('handler error')
        })
    })
})
