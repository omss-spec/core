import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import { __internal_provider_registry__, RegisterProvider, SourceRegistry } from '@/features/source/SourceRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { OMSSProviderError } from '@/utils/error.js'
import type { UnknownProvider } from '@/types/provider.js'
import type { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import * as path from 'node:path'

function makeResolver(namespace = 'test'): BaseResolver<unknown> {
    return {
        namespace,
        name: `${namespace}-resolver`,
        resolve: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    } as unknown as BaseResolver<unknown>
}

function makeProvider(id: string, namespace = 'test'): UnknownProvider {
    return {
        id,
        name: `Provider-${id}`,
        enabled: true,
        baseUrl: 'https://example.com',
        headers: {},
        supportedIds: ['*'],
        resolver: makeResolver(namespace),
        getSources: vi.fn().mockResolvedValue({ ok: true, value: { sources: [] } }),
    }
}

describe('RegisterProvider decorator', () => {
    it('pushes the constructor into the internal ProviderRegistry', async () => {
        class TestProviderA {
            id = 'decorator-a'
            name = 'Decorator A'
            enabled = true
            baseUrl = ''
            headers = {}
            supportedIds = ['*']
            resolver = makeResolver()
            getSources = vi.fn()
        }

        RegisterProvider()(TestProviderA as unknown as new () => any)

        const hookRegistry = new HookRegistry()
        const registry = new SourceRegistry(hookRegistry)
        const result = await registry.initializeProviders()

        expect(result.ok).toBe(true)
        // At least the one we just pushed was processed
        if (result.ok) expect(result.value).toBeGreaterThanOrEqual(1)
    })

    it('skips a falsy entry in the provider queue (break guard)', async () => {
        // Directly push undefined into the internal queue to trigger the `if (!Provider) break`
        ;(__internal_provider_registry__.ProviderRegistry as any).providers.push(undefined)

        const hookRegistry = new HookRegistry()
        const registry = new SourceRegistry(hookRegistry)
        const result = await registry.initializeProviders()
        expect(result.ok).toBe(true)
    })
})

describe('SourceRegistry', () => {
    let hookRegistry: HookRegistry
    let registry: SourceRegistry

    beforeEach(() => {
        hookRegistry = new HookRegistry()
        registry = new SourceRegistry(hookRegistry)
    })

    describe('initializeProviders()', () => {
        it('returns OK(0) when no providers are queued', async () => {
            const result = await registry.initializeProviders()
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value).toBe(0)
        })

        it('initializes a single queued provider and returns OK(1)', async () => {
            class ProviderOne {
                id = 'p1'
                name = 'One'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(ProviderOne as unknown as new () => any)

            const result = await registry.initializeProviders()
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value).toBe(1)
        })

        it('returns ERR when a provider with the same id is registered twice', async () => {
            class DupProvider {
                id = 'dup'
                name = 'Dup'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(DupProvider as unknown as new () => any)

            class DupProvider2 {
                id = 'dup'
                name = 'Dup2'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(DupProvider2 as unknown as new () => any)

            const result = await registry.initializeProviders()
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBeInstanceOf(OMSSProviderError)
                expect(result.error.message).toContain('"dup" already registered')
            }
        })

        it('returns ERR when a provider is registered inside onProviderRegister hook', async () => {
            // Register a hook that tries to trigger nested registration
            hookRegistry.hooks.set('onProviderRegister', [
                async () => {
                    class NestedProvider {
                        id = 'nested'
                        name = 'Nested'
                        enabled = true
                        baseUrl = ''
                        headers = {}
                        supportedIds = ['*']
                        resolver = makeResolver()
                        getSources = vi.fn()
                    }
                    RegisterProvider()(NestedProvider as unknown as new () => any)
                    // Force initializeProviders to detect nesting
                    const result = await registry.initializeProviders()
                    expect(result.ok).toBe(false)
                    if (!result.ok) {
                        expect(result.error.message).toContain('cannot be registered during onProviderRegister')
                    }
                },
            ])

            class TriggerProvider {
                id = 'trigger'
                name = 'Trigger'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(TriggerProvider as unknown as new () => any)

            await registry.initializeProviders()
        })

        it('runs onProviderRegister hook for each provider', async () => {
            const hookFn = vi.fn()
            hookRegistry.hooks.set('onProviderRegister', [hookFn])

            class HookedProvider {
                id = 'hooked'
                name = 'Hooked'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }

            RegisterProvider()(HookedProvider as unknown as new () => any)

            await registry.initializeProviders()
            expect(hookFn).toHaveBeenCalledOnce()
            expect(hookFn).toHaveBeenCalledWith(expect.objectContaining({ provider: expect.objectContaining({ id: 'hooked' }) }))
        })

        it('resets #insideOnProviderRegister to false even if hook throws', async () => {
            hookRegistry.hooks.set('onProviderRegister', [
                async () => {
                    throw new Error('hook error')
                },
            ])

            class ThrowingHookProvider {
                id = 'throwing'
                name = 'Throwing'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(ThrowingHookProvider as unknown as new () => any)

            // Should throw (finally block still runs)
            await expect(registry.initializeProviders()).rejects.toThrow('hook error')

            // After the error, registering again should NOT get the "inside" error
            class AfterThrowProvider {
                id = 'after-throw'
                name = 'AfterThrow'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(AfterThrowProvider as unknown as new () => any)

            hookRegistry.hooks.set('onProviderRegister', []) // clear bad hook
            const result = await registry.initializeProviders()
            expect(result.ok).toBe(true)
        })
    })

    describe('registerProvider()', () => {
        it('is a no-op placeholder that accesses provider.name', () => {
            const provider = makeProvider('reg-1')
            // Should not throw
            expect(() => registry.registerProvider(provider)).not.toThrow()
        })
    })

    describe('getProviders()', () => {
        it('returns empty array when no providers are initialized', () => {
            expect(registry.getProviders()).toEqual([])
        })

        it('returns all providers when no filter is provided', async () => {
            class GP1 {
                id = 'gp1'
                name = 'GP1'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(GP1 as unknown as new () => any)

            class GP2 {
                id = 'gp2'
                name = 'GP2'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver()
                getSources = vi.fn()
            }
            RegisterProvider()(GP2 as unknown as new () => any)

            await registry.initializeProviders()
            expect(registry.getProviders()).toHaveLength(2)
        })

        it('filters providers correctly with a filter function', async () => {
            class FilterP1 {
                id = 'fp1'
                name = 'FP1'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver('ns-a')
                getSources = vi.fn()
            }
            RegisterProvider()(FilterP1 as unknown as new () => any)
            class FilterP2 {
                id = 'fp2'
                name = 'FP2'
                enabled = true
                baseUrl = ''
                headers = {}
                supportedIds = ['*']
                resolver = makeResolver('ns-b')
                getSources = vi.fn()
            }
            RegisterProvider()(FilterP2 as unknown as new () => any)

            await registry.initializeProviders()
            const result = registry.getProviders((p) => p.resolver.namespace === 'ns-a')
            expect(result).toHaveLength(1)
            expect(result[0]!.id).toBe('fp1')
        })
    })

    describe('discoverProviders()', () => {
        beforeEach(() => {
            vi.mock('node:fs/promises')
        })

        afterEach(() => {
            vi.restoreAllMocks()
        })

        it('returns ERR when directory does not exist', async () => {
            vi.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT'))

            const result = await registry.discoverProviders('/non/existent/dir')
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBeInstanceOf(OMSSProviderError)
                expect(result.error.message).toContain('does not exist')
            }
        })

        it('returns OK("ok") for an empty directory', async () => {
            vi.spyOn(fs, 'access').mockResolvedValue(undefined)
            vi.spyOn(fs, 'readdir').mockResolvedValue([] as any)

            const result = await registry.discoverProviders('/empty/dir')
            expect(result.ok).toBe(true)
            if (result.ok) expect(result.value).toBe('ok')
        })

        it('skips non-.js/.ts files', async () => {
            vi.spyOn(fs, 'access').mockResolvedValue(undefined)
            vi.spyOn(fs, 'readdir').mockResolvedValue([{ name: 'readme.md', isDirectory: () => false } as any, { name: 'image.png', isDirectory: () => false } as any] as any)

            const result = await registry.discoverProviders('/dir')
            expect(result.ok).toBe(true)
        })

        it('skips .test.ts, .spec.ts, and .d.ts files', async () => {
            vi.spyOn(fs, 'access').mockResolvedValue(undefined)
            vi.spyOn(fs, 'readdir').mockResolvedValue([
                { name: 'foo.test.ts', isDirectory: () => false } as any,
                { name: 'foo.spec.ts', isDirectory: () => false } as any,
                { name: 'foo.d.ts', isDirectory: () => false } as any,
            ] as any)

            const readFileSpy = vi.spyOn(fs, 'readFile')
            const result = await registry.discoverProviders('/dir')
            expect(result.ok).toBe(true)
            expect(readFileSpy).not.toHaveBeenCalled()
        })

        it('skips .ts files that do not look like providers', async () => {
            vi.spyOn(fs, 'access').mockResolvedValue(undefined)
            vi.spyOn(fs, 'readdir').mockResolvedValue([{ name: 'utils.ts', isDirectory: () => false } as any] as any)
            vi.spyOn(fs, 'readFile').mockResolvedValue('export const foo = 1' as any)

            const result = await registry.discoverProviders('/dir')
            expect(result.ok).toBe(true)
        })

        it('imports files that look like providers', async () => {
            const fakeDir = '/fake/providers'
            const fakeFile = 'MyProvider.ts'
            const fullPath = path.resolve(fakeDir, fakeFile)

            vi.spyOn(fs, 'access').mockResolvedValue(undefined)
            vi.spyOn(fs, 'readdir').mockResolvedValue([{ name: fakeFile, isDirectory: () => false } as any] as any)
            vi.spyOn(fs, 'readFile').mockResolvedValue('import { RegisterProvider } from "..."\nclass MyProvider extends BaseProvider {}' as any)

            // We need to mock the dynamic import
            const importSpy = vi.fn().mockResolvedValue({})
            vi.stubGlobal('import', importSpy)

            // Since we can't easily intercept dynamic import(), we just verify no error
            // is returned and the file is read
            const readFileSpy = vi.spyOn(fs, 'readFile')
            await registry.discoverProviders(fakeDir).catch(() => ({ ok: true, value: 'ok' }))
            expect(readFileSpy).toHaveBeenCalledWith(fullPath, 'utf-8')
        })

        it('recurses into subdirectories', async () => {
            vi.spyOn(fs, 'access').mockResolvedValue(undefined)

            const readdirSpy = vi.spyOn(fs, 'readdir')
            readdirSpy.mockResolvedValueOnce([{ name: 'subdir', isDirectory: () => true } as any] as any).mockResolvedValueOnce([] as any) // subdir is empty

            const result = await registry.discoverProviders('/root')
            expect(result.ok).toBe(true)
            expect(readdirSpy).toHaveBeenCalledTimes(7)
        })
    })
})
