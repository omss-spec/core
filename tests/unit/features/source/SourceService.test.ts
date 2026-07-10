// src/features/source/SourceService.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SourceService } from '@/features/source/SourceService.js'
import { SourceRegistry } from '@/features/source/SourceRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { OMSSServer } from '@/core/server.js'
import { OMSSProviderError } from '@/utils/error.js'
import { ERR, OK } from '@/utils/utils.js'
import type { UnknownProvider } from '@/types/provider.js'
import type { BaseResolver } from '@/features/resolvers/BaseResolver.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResolver(namespace = 'tmdb', name = 'tmdb-resolver'): BaseResolver<unknown> {
    return {
        namespace,
        name,
        resolve: vi.fn().mockResolvedValue(OK({ title: 'Test Movie' })),
    } as unknown as BaseResolver<unknown>
}

function makeProvider(
    id: string,
    opts: {
        namespace?: string
        resolverName?: string
        sources?: string[]
        resolverResult?: ReturnType<typeof OK> | ReturnType<typeof ERR>
        getSourcesResult?: ReturnType<typeof OK> | ReturnType<typeof ERR>
    } = {}
): UnknownProvider {
    const resolver = makeResolver(opts.namespace ?? 'tmdb', opts.resolverName ?? 'tmdb-resolver')
    if (opts.resolverResult) {
        ;(resolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue(opts.resolverResult)
    }

    return {
        id,
        name: `Provider-${id}`,
        enabled: true,
        baseUrl: 'https://example.com',
        headers: {},
        supportedIds: ['*'],
        resolver,
        getSources: vi.fn().mockResolvedValue(opts.getSourcesResult ?? OK({ sources: opts.sources ?? [`source-from-${id}`] })),
    }
}

function makeTestServer(): OMSSServer {
    return new OMSSServer({ name: 'test-server' })
}

// ---------------------------------------------------------------------------
// SourceService unit tests
// ---------------------------------------------------------------------------

describe('SourceService', () => {
    let hookRegistry: HookRegistry
    let sourceRegistry: SourceRegistry
    let service: SourceService
    let server: OMSSServer

    beforeEach(() => {
        hookRegistry = new HookRegistry()
        sourceRegistry = new SourceRegistry(hookRegistry)
        server = makeTestServer()
        service = new SourceService(server, sourceRegistry, hookRegistry)
    })

    // -------------------------------------------------------------------------
    // initializeProviders — delegation
    // -------------------------------------------------------------------------

    describe('initializeProviders()', () => {
        it('delegates to SourceRegistry.initializeProviders', async () => {
            const spy = vi.spyOn(sourceRegistry, 'initializeProviders').mockResolvedValue(OK(0))
            const result = await service.initializeProviders()
            expect(spy).toHaveBeenCalledOnce()
            expect(result).toEqual(OK(0))
        })
    })

    // -------------------------------------------------------------------------
    // registerProvider — delegation
    // -------------------------------------------------------------------------

    describe('registerProvider()', () => {
        it('delegates to SourceRegistry.registerProvider', () => {
            const spy = vi.spyOn(sourceRegistry, 'registerProvider').mockReturnValue(undefined)
            const provider = makeProvider('reg')
            service.registerProvider(provider)
            expect(spy).toHaveBeenCalledWith(provider)
        })
    })

    // -------------------------------------------------------------------------
    // discoverProviders — delegation
    // -------------------------------------------------------------------------

    describe('discoverProviders()', () => {
        it('delegates to SourceRegistry.discoverProviders', async () => {
            const spy = vi.spyOn(sourceRegistry, 'discoverProviders').mockResolvedValue(OK('ok'))
            const result = await service.discoverProviders('/some/dir')
            expect(spy).toHaveBeenCalledWith('/some/dir')
            expect(result).toEqual(OK('ok'))
        })
    })

    // -------------------------------------------------------------------------
    // getSources — invalid OMSS ID
    // -------------------------------------------------------------------------

    describe('getSources() — invalid OMSS ID', () => {
        it('returns ERR for an ID missing the ":" separator', async () => {
            const result = await service.getSources('invalid-id-no-colon')
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toContain('missing namespace separator')
        })

        it('returns ERR for an ID with empty value', async () => {
            const result = await service.getSources('tmdb:')
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toContain('value cannot be empty')
        })

        it('returns ERR for an ID with invalid namespace characters', async () => {
            const result = await service.getSources('INVALID_NS:123')
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toContain('Invalid OMSS namespace')
        })
    })

    // -------------------------------------------------------------------------
    // getSources — no providers
    // -------------------------------------------------------------------------

    describe('getSources() — no matching providers', () => {
        it('returns ERR when no providers match the namespace', async () => {
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBeInstanceOf(OMSSProviderError)
                expect(result.error.message).toContain('No providers found for namespace "tmdb"')
            }
        })

        it('returns ERR message including providerId when specified and no match', async () => {
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([])

            const result = await service.getSources('tmdb:12345', { providerId: 'my-provider' })
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error.message).toContain('provider "my-provider"')
            }
        })
    })

    // -------------------------------------------------------------------------
    // getSources — happy path
    // -------------------------------------------------------------------------

    describe('getSources() — success', () => {
        it('returns aggregated sources from a single provider', async () => {
            const provider = makeProvider('p1', { namespace: 'tmdb', sources: ['url-1', 'url-2'] })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value.sources).toEqual(['url-1', 'url-2'])
        })

        it('merges sources from multiple providers', async () => {
            const p1 = makeProvider('p1', { namespace: 'tmdb', sources: ['a'] })
            const p2 = makeProvider('p2', { namespace: 'tmdb', sources: ['b', 'c'] })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([p1, p2])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value.sources).toEqual(['a', 'b', 'c'])
        })

        it('returns the namespace-only error when no providers match', async () => {
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([])

            const result = await service.getSources('tmdb:12345')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error.message).toBe('No providers found for namespace "tmdb"')
            }
        })

        it('returns the namespace+provider error when providerId is requested but no providers match', async () => {
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([])

            const result = await service.getSources('tmdb:12345', { providerId: 'missing-provider' })

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error.message).toBe('No providers found for namespace "tmdb" and provider "missing-provider"')
            }
        })

        it('filters by providerId when specified', async () => {
            const getProvidersSpy = vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([makeProvider('target', { namespace: 'tmdb', sources: ['x'] })])

            const result = await service.getSources('tmdb:12345', { providerId: 'target' })
            expect(result.ok).toBe(true)
            // The filter function should have been passed
            expect(getProvidersSpy).toHaveBeenCalledWith(expect.any(Function))
        })

        it('deduplicates resolver calls via resolverCache (same namespace:name)', async () => {
            const sharedResolver = makeResolver('tmdb', 'shared-resolver')
            const resolveSpy = sharedResolver.resolve as ReturnType<typeof vi.fn>
            resolveSpy.mockResolvedValue(OK({ title: 'Cached' }))

            const p1: UnknownProvider = { ...makeProvider('p1'), resolver: sharedResolver }
            const p2: UnknownProvider = { ...makeProvider('p2'), resolver: sharedResolver }
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([p1, p2])

            await service.getSources('tmdb:99')
            // Resolver should only be called ONCE despite two providers sharing it
            expect(resolveSpy).toHaveBeenCalledTimes(1)
        })
    })

    // -------------------------------------------------------------------------
    // getSources — resolver failures
    // -------------------------------------------------------------------------

    describe('getSources() — resolver failures', () => {
        it('returns ERR when resolver returns ok:false', async () => {
            const provider = makeProvider('p1', {
                namespace: 'tmdb',
                resolverResult: ERR(new OMSSProviderError('resolver failed')),
            })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toContain('All providers failed')
        })

        it('returns ERR when resolver throws', async () => {
            const provider = makeProvider('p1', { namespace: 'tmdb' })
            ;(provider.resolver.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'))
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toContain('All providers failed')
        })

        it('returns ERR when getSources throws a non-OMSSProviderError', async () => {
            const provider = makeProvider('p1', { namespace: 'tmdb' })
            ;(provider.getSources as ReturnType<typeof vi.fn>).mockRejectedValue('raw string error')
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(false)
        })

        it('returns ERR when getSources throws an OMSSProviderError directly', async () => {
            const provider = makeProvider('p1', { namespace: 'tmdb' })
            ;(provider.getSources as ReturnType<typeof vi.fn>).mockRejectedValue(new OMSSProviderError('direct provider error'))
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(false)
        })

        it('returns ERR when all providers return ok:false from getSources', async () => {
            const provider = makeProvider('p1', {
                namespace: 'tmdb',
                getSourcesResult: ERR(new OMSSProviderError('no sources')),
            })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toContain('All providers failed')
        })

        it('returns OK when at least one provider succeeds even if others fail', async () => {
            const goodProvider = makeProvider('good', { namespace: 'tmdb', sources: ['good-src'] })
            const badProvider = makeProvider('bad', {
                namespace: 'tmdb',
                getSourcesResult: ERR(new OMSSProviderError('bad provider')),
            })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([goodProvider, badProvider])

            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value.sources).toContain('good-src')
        })
    })

    // -------------------------------------------------------------------------
    // getSources — abort signal
    // -------------------------------------------------------------------------

    describe('getSources() — abort signal', () => {
        it('returns ERR("Operation aborted") when signal is pre-aborted', async () => {
            const controller = new AbortController()
            controller.abort()

            const provider = makeProvider('p1', { namespace: 'tmdb' })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345', { abortSignal: controller.signal })
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toBe('Operation aborted')
        })

        it('returns ERR("Operation aborted") when aborted inside resolver execution', async () => {
            const controller = new AbortController()

            const provider = makeProvider('p1', { namespace: 'tmdb' })
            ;(provider.resolver.resolve as ReturnType<typeof vi.fn>).mockImplementation(async () => {
                controller.abort()
                return OK({ title: 'aborted mid-way' })
            })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345', { abortSignal: controller.signal })
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toBe('Operation aborted')
        })

        it('uses its own internal AbortController when no abortSignal is provided', async () => {
            const provider = makeProvider('p1', { namespace: 'tmdb', sources: ['src'] })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            // No abortSignal provided — should work fine
            const result = await service.getSources('tmdb:12345')
            expect(result.ok).toBe(true)
        })

        it('returns ERR when signal is aborted after all providers resolve', async () => {
            const controller = new AbortController()

            const provider = makeProvider('p1', { namespace: 'tmdb', sources: ['src'] })
            ;(provider.getSources as ReturnType<typeof vi.fn>).mockImplementation(async () => {
                controller.abort()
                return OK({ sources: ['src'] })
            })
            vi.spyOn(sourceRegistry, 'getProviders').mockReturnValue([provider])

            const result = await service.getSources('tmdb:12345', { abortSignal: controller.signal })
            expect(result.ok).toBe(false)
            if (!result.ok) expect(result.error.message).toBe('Operation aborted')
        })
    })
})
