import { describe, expect, it } from 'vitest'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { OMSSProviderError } from '@/utils/error.js'
import { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { ParsedOMSSId } from '@/types/resolver.js'
import type { UnknownProvider } from '@/types/provider.js'

class TestResolver extends BaseResolver<{ id: string }> {
    namespace = 'test-namespace'
    name = 'test-resolver'

    async resolve(id: ParsedOMSSId): Promise<any> {
        return { ok: true, value: { id: id.value } }
    }
}

const createProvider = (overrides: Partial<UnknownProvider> = {}): UnknownProvider =>
    ({
        id: overrides.id ?? 'provider-id',
        name: overrides.name ?? 'Provider',
        enabled: overrides.enabled ?? true,
        resolver: overrides.resolver ?? new TestResolver(),
        supportsId: overrides.supportsId ?? (async () => true),
        getSources: overrides.getSources ?? (async () => ({ ok: true, value: { sources: [], subtitles: [], errors: [] } })),
        catalog: overrides.catalog,
    }) as UnknownProvider

describe('ProviderRegistry', () => {
    it('registers provider and retrieves it by id', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider()

        const result = await registry.add(provider)

        expect(result.ok).toBe(true)
        expect(registry.get(provider.id)).toBe(provider)
        expect(registry.has(provider.id)).toBe(true)
        expect(registry.getAll()).toHaveLength(1)
    })

    it('rejects duplicate provider ids', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider()

        const first = await registry.add(provider)
        expect(first.ok).toBe(true)

        const second = await registry.add(provider)

        expect(second.ok).toBe(false)
        if (!second.ok) {
            expect(second.error).toBeInstanceOf(OMSSProviderError)
            expect(second.error.message).toContain('already registered')
        }
    })

    it('validates provider id and resolver namespace format', async () => {
        const registry = new ProviderRegistry()
        const badIdProvider = createProvider({ id: 'BAD ID' } as any)
        const res1 = await registry.add(badIdProvider)
        expect(res1.ok).toBe(false)
        if (!res1.ok) expect(res1.error).toBeInstanceOf(OMSSProviderError)

        const badNamespaceResolver = new TestResolver()
        badNamespaceResolver.namespace = 'bad namespace'
        const badNamespaceProvider = createProvider({ id: 'p2', resolver: badNamespaceResolver })
        const res2 = await registry.add(badNamespaceProvider)
        expect(res2.ok).toBe(false)
        if (!res2.ok) expect(res2.error).toBeInstanceOf(OMSSProviderError)
    })

    it('rejects providers with conflicting resolver namespaces and different resolver instances', async () => {
        const registry = new ProviderRegistry()
        const resolver1 = new TestResolver()
        const resolver2 = new TestResolver()

        const provider1 = createProvider({ id: 'p1', resolver: resolver1 })
        const provider2 = createProvider({ id: 'p2', resolver: resolver2 })

        const first = await registry.add(provider1)
        expect(first.ok).toBe(true)

        const second = await registry.add(provider2)
        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error).toBeInstanceOf(OMSSProviderError)
    })

    it('validates catalog entries and wildcard usage (happy and error paths)', async () => {
        const registry = new ProviderRegistry()

        const wildcardOnlyProvider = createProvider({
            id: 'wildcard',
            catalog: async () => ['*'],
        })
        const res1 = await registry.add(wildcardOnlyProvider)
        expect(res1.ok).toBe(true)

        const mixedCatalogProvider = createProvider({
            id: 'mixed',
            resolver: wildcardOnlyProvider.resolver, // share namespace to avoid extra error
            catalog: async () => ['*', 'id1'],
        })
        const res2 = await registry.add(mixedCatalogProvider)
        expect(res2.ok).toBe(false)
        if (!res2.ok) expect(res2.error).toBeInstanceOf(OMSSProviderError)

        const badEntryProvider = createProvider({
            id: 'bad-entry',
            resolver: wildcardOnlyProvider.resolver,
            catalog: async () => ['valid-id', 'bad id'],
        })
        const res3 = await registry.add(badEntryProvider)
        expect(res3.ok).toBe(false)
        if (!res3.ok) expect(res3.error).toBeInstanceOf(OMSSProviderError)
    })

    it('supports filtering in getAll', async () => {
        const registry = new ProviderRegistry()
        const provider1 = createProvider({ id: 'p1' })
        const provider2 = createProvider({ id: 'p2' })

        await registry.add(provider1)
        await registry.add(provider2)

        const filtered = registry.getAll((p) => p.id === 'p1')
        expect(filtered).toHaveLength(1)
        expect(filtered[0]).toBe(provider1)
    })
})
