import { describe, expect, it } from 'vitest'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { createProvider, createResolver } from '../../utils.js'
import { OMSSProviderError } from '@/utils/error.js'

describe('ProviderRegistry', () => {
    it('adds a provider and retrieves it by id', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider()

        const result = await registry.add(provider)

        expect(result.ok).toBe(true)
        expect(registry.get(provider.id)).toBe(provider)
        expect(registry.has(provider.id)).toBe(true)
    })

    it('returns ERR when adding a duplicate provider id', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider()

        await registry.add(provider)
        const second = await registry.add(provider)

        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error).toBeInstanceOf(OMSSProviderError)
    })

    it('returns ERR for an invalid provider id (whitespace)', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider(undefined, undefined, { id: 'bad id' })

        const result = await registry.add(provider)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('returns ERR for an invalid resolver namespace (whitespace)', async () => {
        const registry = new ProviderRegistry()
        const resolver = createResolver(undefined, undefined, { namespace: 'bad ns' })
        const provider = createProvider(resolver)

        const result = await registry.add(provider)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('returns ERR when two providers share a namespace but use different resolvers', async () => {
        const registry = new ProviderRegistry()

        const resolverA = createResolver(undefined, undefined, { namespace: 'shared' })
        const resolverB = createResolver(undefined, undefined, { namespace: 'shared' })

        const providerA = createProvider(resolverA, undefined, { id: 'provider-a' })
        const providerB = createProvider(resolverB, undefined, { id: 'provider-b' })

        await registry.add(providerA)
        const result = await registry.add(providerB)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('allows two providers to share the same resolver instance', async () => {
        const registry = new ProviderRegistry()

        const sharedResolver = createResolver(undefined, undefined, { namespace: 'shared' })

        const providerA = createProvider(sharedResolver, undefined, { id: 'provider-a' })
        const providerB = createProvider(sharedResolver, undefined, { id: 'provider-b' })

        await registry.add(providerA)
        const result = await registry.add(providerB)

        expect(result.ok).toBe(true)
    })

    it('returns undefined for an unknown provider id', () => {
        const registry = new ProviderRegistry()

        expect(registry.get('does-not-exist')).toBeUndefined()
        expect(registry.has('does-not-exist')).toBe(false)
    })

    it('getAll returns all providers', async () => {
        const registry = new ProviderRegistry()

        const resolverA = createResolver(undefined, undefined, { namespace: 'ns-a' })
        const resolverB = createResolver(undefined, undefined, { namespace: 'ns-b' })
        const providerA = createProvider(resolverA, undefined, { id: 'a' })
        const providerB = createProvider(resolverB, undefined, { id: 'b' })

        await registry.add(providerA)
        await registry.add(providerB)

        expect(registry.getAll()).toHaveLength(2)
    })

    it('getAll with filter returns only matching providers', async () => {
        const registry = new ProviderRegistry()

        const resolverA = createResolver(undefined, undefined, { namespace: 'ns-a' })
        const resolverB = createResolver(undefined, undefined, { namespace: 'ns-b' })
        const providerA = createProvider(resolverA, undefined, { id: 'a' })
        const providerB = createProvider(resolverB, undefined, { id: 'b' })

        await registry.add(providerA)
        await registry.add(providerB)

        const filtered = registry.getAll((p) => p.id === 'a')

        expect(filtered).toHaveLength(1)
        expect(filtered[0]).toBeDefined()
        if (filtered[0]) expect(filtered[0].id).toBe('a')
    })

    it('returns ERR when catalog contains wildcard mixed with other IDs', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider(undefined, undefined, {
            catalog: async () => ['*', 'some-id'],
        })

        const result = await registry.add(provider)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('returns ERR when catalog contains an invalid entry', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider(undefined, undefined, {
            catalog: async () => ['invalid entry with spaces'],
        })

        const result = await registry.add(provider)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('accepts a valid catalog with a wildcard', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider(undefined, undefined, {
            catalog: async () => ['*'],
        })

        const result = await registry.add(provider)

        expect(result.ok).toBe(true)
    })

    it('accepts a valid catalog with specific IDs', async () => {
        const registry = new ProviderRegistry()
        const provider = createProvider(undefined, undefined, {
            catalog: async () => ['tt1234567', 'tt9999999'],
        })

        const result = await registry.add(provider)

        expect(result.ok).toBe(true)
    })
})
