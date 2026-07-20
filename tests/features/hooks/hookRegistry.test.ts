import { TestHooks } from './common.js'
import { describe, expect, it, vi } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'

describe('HookRegistry', () => {
    it('adds hooks and runs them with provided payload', async () => {
        const registry = new HookRegistry<TestHooks>()
        const payload = { value: 1 }
        const fn1 = vi.fn()
        const fn2 = vi.fn()

        registry.add('onEvent', fn1)
        registry.add('onEvent', fn2)

        await registry.run('onEvent', payload)

        expect(fn1).toHaveBeenCalledTimes(1)
        expect(fn1).toHaveBeenCalledWith(payload)
        expect(fn2).toHaveBeenCalledTimes(1)
        expect(fn2).toHaveBeenCalledWith(payload)
    })

    it('reset clears all registered hooks', async () => {
        const registry = new HookRegistry<TestHooks>()
        const fn = vi.fn()

        registry.add('onEvent', fn)
        expect(registry.hooks.size).toBe(1)

        registry.reset()

        expect(registry.hooks.size).toBe(0)
        await registry.run('onEvent', { value: 1 })
        expect(fn).not.toHaveBeenCalled()
    })
})
