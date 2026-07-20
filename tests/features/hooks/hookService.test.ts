import { TestHooks } from './common.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { HookService } from '@/features/hooks/HookService.js'
import { describe, expect, it, vi } from 'vitest'

describe('HookService', () => {
    it('exposes registry hooks map read-only and delegates add/reset', async () => {
        const registry = new HookRegistry<TestHooks>()
        const service = new HookService<TestHooks>(registry)
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
