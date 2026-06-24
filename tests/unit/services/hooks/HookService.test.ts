import { describe, it, expect, vi } from 'vitest'
import { HookRegistry } from '@/services/hooks/HookRegistry.js'
import { HookService } from '@/services/hooks/HookService.js'

describe('HookService', () => {
    function setup() {
        const registry = new HookRegistry()
        const service = new HookService(registry)
        return { registry, service }
    }

    describe('add()', () => {
        it('registers the first handler for a hook', () => {
            const { registry, service } = setup()
            const handler = vi.fn()
            service.add('onError', handler as any)

            expect(registry.hooks.get('onError')).toHaveLength(1)
            expect(registry.hooks.get('onError')![0]).toBe(handler)
        })

        it('appends a second handler without replacing the first', () => {
            const { registry, service } = setup()
            const h1 = vi.fn()
            const h2 = vi.fn()
            service.add('onError', h1 as any)
            service.add('onError', h2 as any)

            const stored = registry.hooks.get('onError')!
            expect(stored).toHaveLength(2)
            expect(stored[0]).toBe(h1)
            expect(stored[1]).toBe(h2)
        })

        it('registers handlers for different hooks independently', () => {
            const { registry, service } = setup()
            service.add('onError', vi.fn() as any)
            service.add('onRegister', vi.fn() as any)

            expect(registry.hooks.get('onError')).toHaveLength(1)
            expect(registry.hooks.get('onRegister')).toHaveLength(1)
        })

        it('the registered handler is invoked when the hook runs', async () => {
            const { registry, service } = setup()
            const handler = vi.fn()
            service.add('onError', handler as any)
            await registry.run('onError', { error: new Error('e') })
            expect(handler).toHaveBeenCalledOnce()
        })

        it('does not mutate the original array when adding a second handler', () => {
            const { registry, service } = setup()
            service.add('onError', vi.fn() as any)
            const original = registry.hooks.get('onError')!

            service.add('onError', vi.fn() as any)
            const updated = registry.hooks.get('onError')!

            expect(updated).not.toBe(original)
            expect(updated).toHaveLength(2)
        })
    })
})
