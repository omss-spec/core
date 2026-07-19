import { describe, expect, it, vi } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { createProviderResultEmitter } from '@/features/providers/ProviderResultEmitter.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { ProviderService } from '@/features/providers/ProviderService.js'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { OMSSProviderError } from '@/utils/error.js'
import type { ParsedOMSSId } from '@/types/resolver.js'
import type { OMSSHooks, ProviderHooks } from '@/types/hooks.js'
import type { UnknownProvider } from '@/types/provider.js'

class TestResolver extends BaseResolver<{ id: string }> {
    namespace = 'ns'
    name = 'resolver'

    async resolve(id: ParsedOMSSId): Promise<any> {
        return { ok: true, value: { id: id.value } }
    }
}

const createProvider = (overrides: Partial<UnknownProvider> = {}): UnknownProvider =>
    ({
        id: overrides.id ?? 'provider',
        name: 'Provider',
        enabled: true,
        resolver: overrides.resolver ?? new TestResolver(),
        supportsId: overrides.supportsId ?? (async () => true),
        getSources:
            overrides.getSources ??
            (async () => ({
                ok: true,
                value: { sources: [], subtitles: [], errors: [] },
            })),
        catalog: overrides.catalog,
    }) as UnknownProvider

describe('createProviderResultEmitter', () => {
    it('emits sources, subtitles, and aggregates errors with hooks', () => {
        const provider = createProvider()
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const sourceHook = vi.fn()
        const subtitleHook = vi.fn()
        const errorHook = vi.fn()
        const doneHook = vi.fn()

        hookRegistry.add('source', sourceHook as ProviderHooks['source'])
        hookRegistry.add('subtitle', subtitleHook as ProviderHooks['subtitle'])
        hookRegistry.add('error', errorHook as ProviderHooks['error'])
        hookRegistry.add('done', doneHook as ProviderHooks['done'])

        const emitter = createProviderResultEmitter(provider, hookRegistry)

        emitter.source({ type: 'hls', url: 'https://example.com', quality: 'HD', header: {}, streamable: true })
        emitter.subtitle({ format: 'vtt', url: 'https://example.com/subs.vtt', label: 'English', header: {} })

        const error = new OMSSProviderError('non-fatal', { cause: 'detail' })
        emitter.error(error)

        const result = emitter.done()

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.sources).toHaveLength(1)
            expect(result.value.subtitles).toHaveLength(1)
            expect(result.value.errors).toHaveLength(1)
        }
        expect(sourceHook).toHaveBeenCalledTimes(1)
        expect(subtitleHook).toHaveBeenCalledTimes(1)
        // error hook called once for non-fatal error
        expect(errorHook).toHaveBeenCalledTimes(1)
        expect(doneHook).toHaveBeenCalledTimes(1)
    })

    it('fatal aggregates accumulated errors and returns ERR', () => {
        const provider = createProvider()
        const hookRegistry = new HookRegistry<ProviderHooks>()
        const errorHook = vi.fn()

        hookRegistry.add('error', errorHook as ProviderHooks['error'])

        const emitter = createProviderResultEmitter(provider, hookRegistry)

        const nonFatal = new OMSSProviderError('non-fatal')
        emitter.error(nonFatal)

        const fatalError = new OMSSProviderError('fatal')
        const result = emitter.fatal(fatalError)

        expect(result.ok).toBe(false)
        expect(result.error).toBeInstanceOf(OMSSProviderError)
        expect(result.error.message).toContain('fatal')
        expect(result.error.cause).toBeInstanceOf(AggregateError)
        // error hook called twice: once for non-fatal error, once for fatal
        expect(errorHook).toHaveBeenCalledTimes(2)
    })
})

interface OMSSHooksWithProviders extends OMSSHooks {
    beforeProviderRegister: (payload: { provider: UnknownProvider }) => void | Promise<void>
    providerRegisterFailed: (payload: { provider: UnknownProvider; error: OMSSProviderError }) => void | Promise<void>
    afterProviderRegister: (payload: { provider: UnknownProvider }) => void | Promise<void>
}

describe('ProviderService', () => {
    const createService = () => {
        const providerRegistry = new ProviderRegistry()
        const omssHookRegistry = new HookRegistry<OMSSHooksWithProviders>()
        const providerHookRegistry = new HookRegistry<ProviderHooks>()
        return {
            service: new ProviderService(providerRegistry, omssHookRegistry, providerHookRegistry),
            providerRegistry,
            omssHookRegistry,
        }
    }

    it('runs hooks around successful provider registration and supports middleware', async () => {
        const { service, providerRegistry, omssHookRegistry } = createService()
        const provider = createProvider()
        const before = vi.fn()
        const after = vi.fn()

        omssHookRegistry.add('beforeProviderRegister', before as OMSSHooksWithProviders['beforeProviderRegister'])
        omssHookRegistry.add('afterProviderRegister', after as OMSSHooksWithProviders['afterProviderRegister'])

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
        const { service, omssHookRegistry } = createService()
        const provider = createProvider({ id: 'duplicate' })
        const duplicate = createProvider({ id: 'duplicate' })
        const failed = vi.fn()

        omssHookRegistry.add('providerRegisterFailed', failed as OMSSHooksWithProviders['providerRegisterFailed'])

        const first = await service.register(provider)
        expect(first.ok).toBe(true)

        const second = await service.register(duplicate)

        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error).toBeInstanceOf(OMSSProviderError)
        expect(failed).toHaveBeenCalledTimes(1)
    })
})
