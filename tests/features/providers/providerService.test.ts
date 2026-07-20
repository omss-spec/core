import { describe, expect, it, vi } from 'vitest'
import { createProvider, createProviderService } from '../../utils.js'
import { OMSSProviderError } from '@/utils/error.js'

describe('ProviderService', () => {
    it('runs hooks around successful provider registration and supports middleware', async () => {
        const { service, providerRegistry, omssHookRegistry } = createProviderService()
        const provider = createProvider()
        const before = vi.fn()
        const after = vi.fn()

        omssHookRegistry.add('beforeProviderRegister', before)
        omssHookRegistry.add('afterProviderRegister', after)

        service.use('register', async (ctx, next) => {
            expect(ctx.provider).toBe(provider)
            return next()
        })

        const result = await service.register(provider)

        expect(result.ok).toBe(true)
        expect(providerRegistry.get(provider.id)).toBe(provider)
        expect(before).toHaveBeenCalledTimes(1)
        expect(after).toHaveBeenCalledTimes(1)
    })

    it('runs failure hook when registry.add fails', async () => {
        const { service, omssHookRegistry } = createProviderService()
        const provider = createProvider(undefined, undefined, { id: 'duplicate' })
        const duplicate = createProvider(undefined, undefined, { id: 'duplicate' })
        const failed = vi.fn()

        omssHookRegistry.add('providerRegisterFailed', failed)

        const first = await service.register(provider)
        expect(first.ok).toBe(true)

        const second = await service.register(duplicate)

        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error).toBeInstanceOf(OMSSProviderError)
        expect(failed).toHaveBeenCalledTimes(1)
    })
})
