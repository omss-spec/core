import { describe, expect, it, vi } from 'vitest'
import { OMSSProviderError, OMSSSourceGatheringError } from '@/utils/error.js'
import { createProvider, createResolver, createSourceCore } from '../../utils.js'
import { OK } from '@/utils/utils.js'

describe('SourceCore.getSources', () => {
    it('returns ERR for an invalid OMSS id', async () => {
        const { core, providerHookService, noopCleaner } = createSourceCore()

        const result = await core.getSources('not-valid-id', {}, providerHookService, noopCleaner)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('returns ERR when no providers exist for the namespace', async () => {
        const { core, providerHookService, noopCleaner } = createSourceCore()

        const result = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.message).toContain('No providers found')
    })

    it('returns ERR when a specific providerId is requested but not registered', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()
        const resolver = createResolver(undefined, undefined, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, { id: 'tmdb-p1' })
        await registry.add(provider)

        const result = await core.getSources('tmdb:12345', { providerId: 'other-provider' }, providerHookService, noopCleaner)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.message).toContain('No providers found')
    })

    it('returns OK when a specific providerId is requested and registered', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()
        const resolver = createResolver({ value: 'meta' }, undefined, { namespace: 'tmdb' })
        const provider = createProvider(
            resolver,
            async (_req, result) => {
                result.source({ type: 'hls', url: 'https://example.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
                return result.done()
            },
            { id: 'tmdb-p1' }
        )
        await registry.add(provider)

        const result = await core.getSources('tmdb:12345', { providerId: 'tmdb-p1' }, providerHookService, noopCleaner)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.sources).toHaveLength(1)
        }
    })

    it('returns OK with sources when provider succeeds', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => {
            result.source({ type: 'hls', url: 'https://example.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })

        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.sources).toHaveLength(1)
            expect(res.value.sources[0]).toBeDefined()
            if (res.value.sources[0]) expect(res.value.sources[0].provider.id).toBe(provider.id)
        }
    })

    it('returns ERR when all providers return fatal', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => {
            return result.fatal(new OMSSProviderError('totally failed'))
        })

        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('includes partial results when one provider succeeds and another fails', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const sharedResolver = createResolver({ value: 'meta' })
        Object.assign(sharedResolver, { namespace: 'tmdb' })

        const goodProvider = createProvider(
            sharedResolver,
            async (_req, result) => {
                result.source({ type: 'hls', url: 'https://good.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
                return result.done()
            },
            { id: 'good-provider' }
        )

        const badProvider = createProvider(
            sharedResolver,
            async (_req, result) => {
                return result.fatal(new OMSSProviderError('bad provider failed'))
            },
            { id: 'bad-provider' }
        )

        await registry.add(goodProvider)
        await registry.add(badProvider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.sources).toHaveLength(1)
            expect(res.value.errors.length).toBeGreaterThan(0)
        }
    })

    it('skips provider that does not support the id', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(
            resolver,
            async (_req, result) => {
                result.source({ type: 'hls', url: 'https://example.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
                return result.done()
            },
            { supportsId: async () => false }
        )

        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        // provider returned OK({sources: [], ...}) — so hasSuccess=true but 0 sources
        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.sources).toHaveLength(0)
    })

    it('returns ERR when abort signal is already aborted', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, {})
        await registry.add(provider)

        const controller = new AbortController()
        controller.abort()

        const res = await core.getSources('tmdb:12345', { abortSignal: controller.signal }, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error.message).toContain('aborted')
    })

    it('deduplicates resolver calls when multiple providers share the same resolver', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolveFn = vi.fn(async () => OK({ value: 'meta' }))
        const sharedResolver = createResolver({ value: 'meta' }, resolveFn)
        Object.assign(sharedResolver, { namespace: 'tmdb' })

        const provA = createProvider(sharedResolver, async (_req, result) => result.done(), { id: 'a' })
        const provB = createProvider(sharedResolver, async (_req, result) => result.done(), { id: 'b' })

        await registry.add(provA)
        await registry.add(provB)

        await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        // Both providers share the same resolver key → resolved only once
        expect(resolveFn).toHaveBeenCalledTimes(1)
    })

    it('returns ERR for an invalid OMSS id', async () => {
        const { core, providerHookService, noopCleaner } = createSourceCore()

        const result = await core.getSources('not-valid-id', {}, providerHookService, noopCleaner)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('returns ERR when no providers exist for the namespace', async () => {
        const { core, providerHookService, noopCleaner } = createSourceCore()

        const result = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.message).toContain('No providers found')
    })

    it('returns ERR when a specific providerId is requested but not registered', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()
        const resolver = createResolver(undefined, undefined, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, { id: 'tmdb-p1' })
        await registry.add(provider)

        const result = await core.getSources('tmdb:12345', { providerId: 'other-provider' }, providerHookService, noopCleaner)

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.message).toContain('No providers found')
    })

    it('returns OK with sources when provider succeeds', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => {
            result.source({ type: 'hls', url: 'https://example.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })

        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.sources).toHaveLength(1)
            expect(res.value.sources[0]).toBeDefined()
            if (res.value.sources[0]) expect(res.value.sources[0].provider.id).toBe(provider.id)
        }
    })

    it('returns ERR when all providers return fatal', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => {
            return result.fatal(new OMSSProviderError('totally failed'))
        })

        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('includes partial results when one provider succeeds and another fails', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const sharedResolver = createResolver({ value: 'meta' })
        Object.assign(sharedResolver, { namespace: 'tmdb' })

        const goodProvider = createProvider(
            sharedResolver,
            async (_req, result) => {
                result.source({ type: 'hls', url: 'https://good.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
                return result.done()
            },
            { id: 'good-provider' }
        )

        const badProvider = createProvider(
            sharedResolver,
            async (_req, result) => {
                return result.fatal(new OMSSProviderError('bad provider failed'))
            },
            { id: 'bad-provider' }
        )

        await registry.add(goodProvider)
        await registry.add(badProvider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.sources).toHaveLength(1)
            expect(res.value.errors.length).toBeGreaterThan(0)
        }
    })

    it('skips provider that does not support the id', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(
            resolver,
            async (_req, result) => {
                result.source({ type: 'hls', url: 'https://example.com/stream.m3u8', header: {}, streamable: true, quality: 'HD' })
                return result.done()
            },
            { supportsId: async () => false }
        )

        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        // provider returned OK({sources: [], ...}) — so hasSuccess=true but 0 sources
        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.sources).toHaveLength(0)
    })

    it('returns ERR when abort signal is already aborted', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, undefined, {})
        await registry.add(provider)

        const controller = new AbortController()
        controller.abort()

        const res = await core.getSources('tmdb:12345', { abortSignal: controller.signal }, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error.message).toContain('aborted')
    })

    it('deduplicates resolver calls when multiple providers share the same resolver', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolveFn = vi.fn(async () => OK({ value: 'meta' }))
        const sharedResolver = createResolver({ value: 'meta' }, resolveFn)
        Object.assign(sharedResolver, { namespace: 'tmdb' })

        const provA = createProvider(sharedResolver, async (_req, result) => result.done(), { id: 'a' })
        const provB = createProvider(sharedResolver, async (_req, result) => result.done(), { id: 'b' })

        await registry.add(provA)
        await registry.add(provB)

        await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        // Both providers share the same resolver key → resolved only once
        expect(resolveFn).toHaveBeenCalledTimes(1)
    })

    it('returns ERR when resolver fails inside getResolvedMeta', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' }, async () => ({ ok: false as const, error: new (await import('@/utils/error.js')).OMSSResolverError('resolver blew up') }))
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => result.done())
        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('returns ERR when abort fires between supportsId and getResolvedMeta', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const controller = new AbortController()
        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => result.done(), {
            supportsId: async () => {
                // abort right after supportsId returns true
                controller.abort()
                return true
            },
        })
        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', { abortSignal: controller.signal }, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error.message).toContain('aborted')
    })

    it('returns ERR when abort fires inside getResolvedMeta resolver execution', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const controller = new AbortController()
        const resolver = createResolver({ value: 'meta' }, async () => {
            controller.abort()
            return OK({ value: 'meta' })
        })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => result.done())
        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', { abortSignal: controller.signal }, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error.message).toContain('aborted')
    })

    it('handles a provider whose getSources promise rejects (Promise.allSettled rejected branch)', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async () => {
            throw new Error('unexpected crash')
        })
        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('handles a provider rejection with a non-Error reason', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async () => {
            throw 'non-error rejection'
        })
        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', {}, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('returns ERR when signal is aborted after Promise.allSettled resolves', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const controller = new AbortController()
        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => {
            controller.abort()
            return result.done()
        })
        await registry.add(provider)

        const res = await core.getSources('tmdb:12345', { abortSignal: controller.signal }, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error.message).toContain('aborted')
    })

    it('returns ERR when signal aborts before resolver execution in getResolvedMeta', async () => {
        const { core, registry, providerHookService, noopCleaner } = createSourceCore()

        const controller = new AbortController()
        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })

        const provider = createProvider(resolver, async (_req, result) => result.done())
        await registry.add(provider)

        const realResolver = provider.resolver
        let resolverAccessCount = 0
        Object.defineProperty(provider, 'resolver', {
            configurable: true,
            get() {
                resolverAccessCount += 1
                if (resolverAccessCount >= 2) {
                    controller.abort()
                }
                return realResolver
            },
        })

        const res = await core.getSources('tmdb:12345', { abortSignal: controller.signal }, providerHookService, noopCleaner)

        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.error.message).toContain('aborted')
    })
})
