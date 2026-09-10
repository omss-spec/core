import { type TestHooks } from './common.js'
import { createHookRegistry } from '@/features/hooks/HookRegistry.js'
import { createHookService } from '@/features/hooks/HookService.js'
import { describe, expect, it, vi } from 'vitest'

describe('HookService', () => {
    it('exposes registry hooks map read-only and delegates add/reset', async () => {
        const registry = createHookRegistry<TestHooks>()
        const service = createHookService<TestHooks>(registry)
        const fn = vi.fn()

        service.add('onEvent', fn)

        // Hooks map is shared
        expect(service.hooks.size).toBe(1)

        await registry.run('onEvent', { value: 123 })
        expect(fn).toHaveBeenCalledWith({ value: 123 })

        service.reset()
        expect(service.hooks.size).toBe(0)
    })
})
