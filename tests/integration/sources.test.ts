import { beforeEach, describe, expect, it } from 'vitest'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { SourceRegistry } from '@/features/source/SourceRegistry.js'

describe('source integration tests', () => {
    let hookRegistry: HookRegistry
    let registry: SourceRegistry

    beforeEach(() => {
        hookRegistry = new HookRegistry()
        registry = new SourceRegistry(hookRegistry)
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
    })
})
