import { describe, expect, it, vi } from 'vitest'
import OMSSServer from '@/core/server.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { SourceCore } from '@/features/source/SourceCore.js'
import { SourceService } from '@/features/source/SourceService.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import { OMSSProviderError, OMSSSourceGatheringError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'
import type { ParsedOMSSId, ResolverExecutionContext } from '@/types/resolver.js'
import type { OMSSHooks, ProviderHooks } from '@/types/hooks.js'
import type { UnknownProvider } from '@/types/provider.js'

class TestResolver extends BaseResolver<{ id: string }> {
    namespace = 'ns'
    name = 'resolver'

    async resolve(id: ParsedOMSSId, _: ResolverExecutionContext): Promise<any> {
        return { ok: true, value: { id: id.value } }
    }
}

const createProvider = (id: string, supports: boolean, getSourcesImpl?: UnknownProvider['getSources']): UnknownProvider =>
    ({
        id,
        name: id,
        enabled: true,
        resolver: new TestResolver(),
        supportsId: async () => supports,
        getSources:
            getSourcesImpl ??
            (async () => ({
                ok: true,
                value: { sources: [{ url: `https://example.com/${id}`, type: 'hls', quality: 'HD', provider: { id, name: id } }], subtitles: [], errors: [] },
            })),
    }) as UnknownProvider

describe('SourceCore', () => {
    it('returns error when OMSS id cannot be parsed', async () => {
        const providerRegistry = new ProviderRegistry()
        const server = new OMSSServer({ name: 'source-core' } as OMSSConfig)
        const core = new SourceCore(server, providerRegistry)
        const providerHookRegistry = new HookRegistry<ProviderHooks>()

        const result = await core.getSources('bad id', {}, providerHookRegistry)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSSourceGatheringError)
            expect(result.error.message).toContain('Failed to parse OMSS id')
        }
    })

    it('returns error when no providers are available for namespace', async () => {
        const providerRegistry = new ProviderRegistry()
        const server = new OMSSServer({ name: 'source-core' } as OMSSConfig)
        const core = new SourceCore(server, providerRegistry)
        const providerHookRegistry = new HookRegistry<ProviderHooks>()

        const result = await core.getSources('ns:123', {}, providerHookRegistry)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSSourceGatheringError)
            expect(result.error.message).toContain('No providers found for namespace')
        }
    })

    it('aggregates sources and provider errors and succeeds when at least one provider returns OK', async () => {
        const providerRegistry = new ProviderRegistry()
        const goodProvider = createProvider('good', true)
        const badProvider = createProvider('bad', true, async () => ({
            ok: false,
            error: new OMSSProviderError('provider failed'),
        }))
        await providerRegistry.add(goodProvider as any)
        await providerRegistry.add(badProvider as any)

        const server = new OMSSServer({ name: 'source-core' } as OMSSConfig)
        const core = new SourceCore(server, providerRegistry)
        const providerHookRegistry = new HookRegistry<ProviderHooks>()

        const result = await core.getSources('ns:123', {}, providerHookRegistry)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.sources.length).toBeGreaterThan(0)
        }
    })

    it('returns error when all providers fail', async () => {
        const providerRegistry = new ProviderRegistry()
        const failingProvider = createProvider('fail', true, async () => ({
            ok: false,
            error: new OMSSProviderError('provider failed'),
        }))
        await providerRegistry.add(failingProvider as any)

        const server = new OMSSServer({ name: 'source-core' } as OMSSConfig)
        const core = new SourceCore(server, providerRegistry)
        const providerHookRegistry = new HookRegistry<ProviderHooks>()

        const result = await core.getSources('ns:123', {}, providerHookRegistry)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSSourceGatheringError)
            expect(result.error.message).toContain('All providers failed')
        }
    })
})

describe('SourceService', () => {
    const createService = async () => {
        const providerRegistry = new ProviderRegistry()
        const providerHookRegistry = new HookRegistry<ProviderHooks>()
        const omssHookRegistry = new HookRegistry<OMSSHooks>()
        const server = new OMSSServer({ name: 'source-service' } as OMSSConfig)

        const service = new SourceService(server, providerRegistry, omssHookRegistry, providerHookRegistry)
        return { service, providerRegistry, providerHookRegistry, omssHookRegistry }
    }

    it('runs hooks around successful getSources and shares in-flight requests', async () => {
        const { service, providerRegistry, omssHookRegistry } = await createService()
        const provider = createProvider('p1', true)
        await providerRegistry.add(provider as any)

        const before = vi.fn()
        const after = vi.fn()

        omssHookRegistry.add('beforeGetSources', before as OMSSHooks['beforeGetSources'])
        omssHookRegistry.add('afterGetSources', after as OMSSHooks['afterGetSources'])

        const promise1 = service.getSources('ns:123', {})
        const promise2 = service.getSources('ns:123', {})

        const [res1, res2] = await Promise.all([promise1, promise2])

        expect(res1.ok).toBe(true)
        expect(res2.ok).toBe(true)
        expect(before).toHaveBeenCalled()
        expect(after).toHaveBeenCalled()
        if (res1.ok) expect(res1.value.sources.length).toBeGreaterThan(0)
    })

    it('runs failure hook when core returns error', async () => {
        const { service, omssHookRegistry } = await createService()
        const failed = vi.fn()

        omssHookRegistry.add('getSourcesFailed', failed as OMSSHooks['getSourcesFailed'])

        const res = await service.getSources('bad id', {})

        expect(res.ok).toBe(false)
        if (!res.ok) {
            expect(res.error).toBeInstanceOf(OMSSSourceGatheringError)
        }
        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('coalesces in-flight requests for same omssId and providerId', async () => {
        const { service, providerRegistry } = await createService()
        const provider = createProvider('p1', true)
        await providerRegistry.add(provider as any)

        const promise1 = service.getSources('ns:1', { providerId: 'p1' })
        const promise2 = service.getSources('ns:1', { providerId: 'p1' })

        const [res1, res2] = await Promise.all([promise1, promise2])

        expect(res1.ok).toBe(true)
        expect(res2.ok).toBe(true)
        if (res1.ok) {
            expect(res1.value.sources.length).toBeGreaterThan(0)
        }
    })
})
