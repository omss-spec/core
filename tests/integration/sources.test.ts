import { beforeEach, describe, expect, it } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { SourceService } from '@/features/source/SourceService.js'
import OMSSServer from '@/core/server.js'

describe('source integration tests', () => {
    let hookRegistry: HookRegistry
    let registry: ProviderRegistry
    let service: SourceService

    beforeEach(() => {
        hookRegistry = new HookRegistry()
        registry = new ProviderRegistry(hookRegistry)
        service = new SourceService(new OMSSServer({ name: 'mock' }), registry, hookRegistry)
    })

    describe('discoverProviders() but realistic', () => {
        it('discovers and imports provider files that match the provider heuristic', async () => {
            const discoverResult = await registry.discoverProviders('tests/fixtures/source/discovery')
            expect(discoverResult.ok).toBe(true)
            if (discoverResult.ok) {
                expect(discoverResult.value).toBe('ok')
            }

            const initResult = await registry.initializeProviders()
            expect(initResult.ok).toBe(true)

            const providers = registry.getProviders()
            expect(providers.some((p) => p.id === 'discovered-provider')).toBe(true)
        })

        it('abort signal irl', async () => {
            await registry.discoverProviders('tests/fixtures/source/discovery')
            const init = await registry.initializeProviders()
            expect(init.ok).toBe(true)
            if (init.ok) {
                expect(init.value).toBe(1)
            }

            const abort = new AbortController()
            setTimeout(() => abort.abort(), 1300)
            const res = await service.getSources('tmdb:155', { abortSignal: abort.signal })
            console.log(res)
        })
    })
})
