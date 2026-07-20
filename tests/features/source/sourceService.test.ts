import { describe, expect, it, vi } from 'vitest'
import { OMSSSourceGatheringError } from '@/utils/error.js'
import { createProvider, createResolver, createSourceService } from '../../utils.js'

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
