import { describe, it, expect, vi } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { HookService } from '@/features/hooks/HookService.js'

interface TestHooks {
    onEvent: (payload: { value: number }) => void | Promise<void>
}

describe('HookRegistry', () => {
    it('adds hooks and runs them with provided payload', async () => {
        const registry = new HookRegistry<TestHooks>()
        const payload = { value: 1 }
        const fn1 = vi.fn()
        const fn2 = vi.fn()

        registry.add('onEvent', fn1 as TestHooks['onEvent'])
        registry.add('onEvent', fn2 as TestHooks['onEvent'])

        await registry.run('onEvent', payload)

        expect(fn1).toHaveBeenCalledTimes(1)
        expect(fn1).toHaveBeenCalledWith(payload)
        expect(fn2).toHaveBeenCalledTimes(1)
        expect(fn2).toHaveBeenCalledWith(payload)
    })

    it('reset clears all registered hooks', async () => {
        const registry = new HookRegistry<TestHooks>()
        const fn = vi.fn()

        registry.add('onEvent', fn as TestHooks['onEvent'])
        expect(registry.hooks.size).toBe(1)

        registry.reset()

        expect(registry.hooks.size).toBe(0)
        await registry.run('onEvent', { value: 1 })
        expect(fn).not.toHaveBeenCalled()
    })
})

describe('HookService', () => {
    it('exposes registry hooks map read-only and delegates add/reset', async () => {
        const registry = new HookRegistry<TestHooks>()
        const service = new HookService<TestHooks>(registry)
        const fn = vi.fn()

        service.add('onEvent', fn as TestHooks['onEvent'])

        // Hooks map is shared
        expect(service.hooks.size).toBe(1)

        await registry.run('onEvent', { value: 123 })
        expect(fn).toHaveBeenCalledWith({ value: 123 })

        service.reset()
        expect(service.hooks.size).toBe(0)
    })
})
