import { describe, expect, it, vi } from 'vitest'
import { OMSSSourceGatheringError } from '@/utils/error.js'
import { createProvider, createResolver, createSourceService } from '../../utils.js'
import { createHookService } from '@/features/hooks/HookService.js'
import { type ProviderHooks } from '@/types/hooks.js'

describe('SourceService.getSources', () => {
    it('returns ERR for an invalid OMSS id', async () => {
        const { service } = createSourceService()

        const result = await service.getSources('invalid-id')

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSSourceGatheringError)
    })

    it('returns ERR when no provider handles the namespace', async () => {
        const { service } = createSourceService()

        const result = await service.getSources('tmdb:99999')

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.message).toContain('No providers found')
    })

    it('fires beforeGetSources and afterGetSources hooks on success', async () => {
        const { service, providerRegistry, hookRegistry } = createSourceService()

        const before = vi.fn()
        const after = vi.fn()
        hookRegistry.add('beforeGetSources', before)
        hookRegistry.add('afterGetSources', after)

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, async (_req, result) => {
            result.source({ type: 'hls', url: 'https://example.com/s.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })
        await providerRegistry.add(provider)

        await service.getSources('tmdb:12345')

        expect(before).toHaveBeenCalledTimes(1)
        expect(after).toHaveBeenCalledTimes(1)
    })

    it('fires getSourcesFailed hook on failure', async () => {
        const { service, hookRegistry } = createSourceService()

        const failed = vi.fn()
        hookRegistry.add('getSourcesFailed', failed)

        await service.getSources('tmdb:99999')

        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('middleware intercepts getSources', async () => {
        const { service } = createSourceService()
        const interceptor = vi.fn((ctx: any, next: () => any) => next())

        service.use('getSources', interceptor)

        await service.getSources('invalid-id')

        expect(interceptor).toHaveBeenCalledTimes(1)
    })

    it('deduplicates concurrent in-flight requests for the same id', async () => {
        const { service, providerRegistry } = createSourceService()

        let resolveCount = 0
        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, async (_req, result) => {
            resolveCount++
            result.source({ type: 'hls', url: 'https://example.com/s.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })
        await providerRegistry.add(provider)

        const [r1, r2, r3] = await Promise.all([service.getSources('tmdb:12345'), service.getSources('tmdb:12345'), service.getSources('tmdb:12345')])

        expect(r1.ok).toBe(true)
        expect(r2.ok).toBe(true)
        expect(r3.ok).toBe(true)
        // All three share one in-flight promise, so provider ran only once
        expect(resolveCount).toBe(1)
    })

    it('does not coalesce concurrent requests that each supply their own providerHookService', async () => {
        const { service, providerRegistry } = createSourceService()

        let resolveCount = 0
        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, async (_req, result) => {
            resolveCount++
            result.source({ type: 'hls', url: 'https://example.com/s.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })
        await providerRegistry.add(provider)

        const hooksA = createHookService<ProviderHooks>()
        const hooksB = createHookService<ProviderHooks>()
        const sourceEventsA: string[] = []
        const sourceEventsB: string[] = []
        hooksA.add('source', ({ source }) => {
            sourceEventsA.push(source.url)
        })
        hooksB.add('source', ({ source }) => {
            sourceEventsB.push(source.url)
        })

        const [r1, r2] = await Promise.all([service.getSources('tmdb:12345', { providerHookService: hooksA }), service.getSources('tmdb:12345', { providerHookService: hooksB })])

        expect(r1.ok).toBe(true)
        expect(r2.ok).toBe(true)
        // Each caller's own providerHookService must receive its own events —
        // coalescing would have made one caller's hook service never fire.
        expect(resolveCount).toBe(2)
        expect(sourceEventsA).toHaveLength(1)
        expect(sourceEventsB).toHaveLength(1)
    })

    it('does not coalesce concurrent requests that each supply their own cleaningFunction', async () => {
        const { service, providerRegistry } = createSourceService()

        let resolveCount = 0
        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, async (_req, result) => {
            resolveCount++
            result.source({ type: 'hls', url: 'https://example.com/s.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })
        await providerRegistry.add(provider)

        const [r1, r2] = await Promise.all([
            service.getSources('tmdb:12345', { cleaningFunction: (obj) => ({ ...obj, url: obj.url + '?caller=a' }) }),
            service.getSources('tmdb:12345', { cleaningFunction: (obj) => ({ ...obj, url: obj.url + '?caller=b' }) }),
        ])

        expect(resolveCount).toBe(2)
        expect(r1.ok).toBe(true)
        expect(r2.ok).toBe(true)
        if (r1.ok && r2.ok) {
            expect(r1.value.sources[0]?.url).toContain('?caller=a')
            expect(r2.value.sources[0]?.url).toContain('?caller=b')
        }
    })

    it('cleaningFunction is applied to source URLs', async () => {
        const { service, providerRegistry } = createSourceService()

        service.cleaningFunction = (obj) => ({ ...obj, url: obj.url + '?token=abc' })

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, async (_req, result) => {
            result.source({ type: 'hls', url: 'https://example.com/s.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })
        await providerRegistry.add(provider)

        const res = await service.getSources('tmdb:12345')

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.sources[0]).toBeDefined()
            if (res.value.sources[0]) expect(res.value.sources[0].url).toContain('?token=abc')
        }
    })

    it('cleaningFunction getter returns the currently assigned function', () => {
        const { service } = createSourceService()

        const custom = (obj: { url: string; header: Record<string, string> }) => obj
        service.cleaningFunction = custom

        expect(service.cleaningFunction).toBe(custom)
    })

    it('afterGetSources middleware can transform the result', async () => {
        const { service, providerRegistry } = createSourceService()

        const resolver = createResolver({ value: 'meta' })
        Object.assign(resolver, { namespace: 'tmdb' })
        const provider = createProvider(resolver, async (_req, result) => {
            result.source({ type: 'hls', url: 'https://example.com/s.m3u8', header: {}, streamable: true, quality: 'HD' })
            return result.done()
        })
        await providerRegistry.add(provider)

        service.use('afterGetSources', async (ctx, next) => {
            const res = await next()
            if (res.ok) {
                // Inject an extra source marker for test
                ;(res.value as any).__test = true
            }
            return res
        })

        const res = await service.getSources('tmdb:12345')

        expect(res.ok).toBe(true)
        if (res.ok) expect((res.value as any).__test).toBe(true)
    })
})
