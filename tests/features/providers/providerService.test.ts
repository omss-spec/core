import { describe, expect, it, vi } from 'vitest'
import { createProvider, createProviderService, createResolver } from '../../utils.js'
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

    it('get returns undefined for unknown id', async () => {
        const { service } = createProviderService()
        expect(service.get('unknown')).toBeUndefined()
    })

    it('has returns false before registration and true after', async () => {
        const { service } = createProviderService()
        const provider = createProvider()

        expect(service.has(provider.id)).toBe(false)
        await service.register(provider)
        expect(service.has(provider.id)).toBe(true)
    })

    it('getAll returns all registered providers', async () => {
        const { service } = createProviderService()

        const resolverA = createResolver(undefined, undefined, { namespace: 'ns-a' })
        const resolverB = createResolver(undefined, undefined, { namespace: 'ns-b' })
        const providerA = createProvider(resolverA, undefined, { id: 'a' })
        const providerB = createProvider(resolverB, undefined, { id: 'b' })

        await service.register(providerA)
        await service.register(providerB)

        expect(service.getAll()).toHaveLength(2)
    })

    it('getAll with filter narrows results', async () => {
        const { service } = createProviderService()

        const resolverA = createResolver(undefined, undefined, { namespace: 'ns-a' })
        const resolverB = createResolver(undefined, undefined, { namespace: 'ns-b' })
        const providerA = createProvider(resolverA, undefined, { id: 'a' })
        const providerB = createProvider(resolverB, undefined, { id: 'b' })

        await service.register(providerA)
        await service.register(providerB)

        expect(service.getAll((p) => p.id === 'a')).toHaveLength(1)
    })

    it('returns ERR when registering inside beforeProviderRegister hook', async () => {
        const { service, omssHookRegistry } = createProviderService()
        const provider = createProvider()
        const nested = createProvider(undefined, undefined, { id: 'nested' })

        omssHookRegistry.add('beforeProviderRegister', async () => {
            const res = await service.register(nested)
            expect(res.ok).toBe(false)
            if (!res.ok) expect(res.error).toBeInstanceOf(OMSSProviderError)
        })

        await service.register(provider)
    })

    it('catalog returns empty map when no providers have a catalog', async () => {
        const { service } = createProviderService()
        const provider = createProvider()
        await service.register(provider)

        const result = await service.catalog()

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value.size).toBe(0)
    })

    it('catalog aggregates IDs per namespace', async () => {
        const { service } = createProviderService()
        const resolver = createResolver(undefined, undefined, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, {
            id: 'tmdb-provider',
            catalog: async () => ['tt001', 'tt002'],
        })
        await service.register(provider)

        const result = await service.catalog()

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.get('tmdb')).toEqual(['tt001', 'tt002'])
        }
    })

    it('catalog collapses namespace to ["*"] when any provider returns wildcard', async () => {
        const { service } = createProviderService()
        const resolver = createResolver(undefined, undefined, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, {
            id: 'tmdb-wild',
            catalog: async () => ['*'],
        })
        await service.register(provider)

        const result = await service.catalog()

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value.get('tmdb')).toEqual(['*'])
    })

    it('catalogForNamespace returns ERR when no providers are in that namespace', async () => {
        const { service } = createProviderService()

        const result = await service.catalogForNamespace('unknown-ns')

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('catalogForNamespace returns ERR when providers exist but none expose a catalog', async () => {
        const { service } = createProviderService()
        const resolver = createResolver(undefined, undefined, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, { id: 'tmdb-no-catalog' })
        await service.register(provider)

        const result = await service.catalogForNamespace('tmdb')

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSProviderError)
    })

    it('catalogForNamespace returns ["*"] when a provider catalog returns wildcard', async () => {
        const { service } = createProviderService()
        const resolver = createResolver(undefined, undefined, { namespace: 'imdb' })
        const providerA = createProvider(resolver, undefined, {
            id: 'imdb-wild-b',
            catalog: async () => ['144'],
        })
        const providerB = createProvider(resolver, undefined, {
            id: 'imdb-wild-a',
            catalog: async () => ['*'],
        })
        await service.register(providerA)
        await service.register(providerB)

        const result = await service.catalogForNamespace('imdb')

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toEqual(['*'])
    })

    it('catalogForNamespace merges IDs from multiple providers in the same namespace', async () => {
        const { service } = createProviderService()

        const sharedResolver = createResolver(undefined, undefined, { namespace: 'imdb' })
        const providerA = createProvider(sharedResolver, undefined, {
            id: 'imdb-a',
            catalog: async () => ['tt001', 'tt002'],
        })
        const providerB = createProvider(sharedResolver, undefined, {
            id: 'imdb-b',
            catalog: async () => ['tt002', 'tt003'],
        })

        await service.register(providerA)
        await service.register(providerB)

        const result = await service.catalogForNamespace('imdb')

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toContain('tt001')
            expect(result.value).toContain('tt002')
            expect(result.value).toContain('tt003')
            expect(result.value).toHaveLength(3)
        }
    })
})
