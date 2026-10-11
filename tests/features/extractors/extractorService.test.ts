import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createExtractorRegistry, type ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { createExtractorService, type ExtractorService } from '@/features/extractors/ExtractorService.js'
import { OMSSExtractorError } from '@/utils/error.js'
import { createExtractor } from '../../utils.js'
import { createHookRegistry } from '@/features/hooks/HookRegistry.js'
import { type OMSSHooks } from '@/types/hooks.js'

describe('ExtractorService', () => {
    let registry: ExtractorRegistry
    let service: ExtractorService

    beforeEach(() => {
        registry = createExtractorRegistry()
        service = createExtractorService(registry, createHookRegistry<OMSSHooks>())
    })

    it('returns all registered extractors', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        expect(service.extractors).toEqual([extractor])
    })

    it('register adds an extractor', async () => {
        const extractor = createExtractor()

        const result = await service.register(extractor)

        expect(result.ok).toBe(true)
        expect(registry.has(extractor)).toBe(true)
    })

    it('runs hooks around successful extractor registration', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()

        const before = vi.fn()
        const after = vi.fn()

        hooks.add('beforeRegisterExtractor', before)
        hooks.add('afterRegisterExtractor', after)

        const service = createExtractorService(registry, hooks)

        const extractor = createExtractor()

        const result = await service.register(extractor)

        expect(result.ok).toBe(true)
        expect(before).toHaveBeenCalledTimes(1)
        expect(after).toHaveBeenCalledTimes(1)
    })

    it('runs hooks around successful extractor lookup', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()

        const before = vi.fn()
        const after = vi.fn()

        hooks.add('beforeFindExtractor', before)
        hooks.add('afterFindExtractor', after)

        const extractor = createExtractor(true)
        registry.add(extractor)

        const service = createExtractorService(registry, hooks)

        const result = await service.find('https://example.com')

        expect(result.ok).toBe(true)

        expect(before).toHaveBeenCalledWith({
            url: 'https://example.com',
        })

        expect(after).toHaveBeenCalledWith({
            url: 'https://example.com',
            extractor,
        })
    })

    it('runs failure hook when no extractor matches', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()

        const failed = vi.fn()

        hooks.add('findExtractorFailed', failed)

        registry.add(createExtractor(false))

        const service = createExtractorService(registry, hooks)

        const result = await service.find('https://example.com')

        expect(result.ok).toBe(false)
        expect(failed).toHaveBeenCalledTimes(1)

        expect(failed.mock.calls[0]).toBeDefined()
        if (failed.mock.calls[0]) {
            expect(failed.mock.calls[0][0].url).toBe('https://example.com')
            expect(failed.mock.calls[0][0].error).toBeInstanceOf(OMSSExtractorError)
        }
    })

    it('prevents extractors from being registered during beforeRegisterExtractor', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()

        const service = createExtractorService(registry, hooks)

        const a = createExtractor()
        const b = createExtractor()

        hooks.add('beforeRegisterExtractor', async () => {
            const result = await service.register(b)

            expect(result.ok).toBe(false)

            if (!result.ok) {
                expect(result.error).toBeInstanceOf(OMSSExtractorError)
                expect(result.error.message).toContain('Extractors cannot be registered during beforeRegisterExtractor')
            }
        })

        const result = await service.register(a)

        expect(result.ok).toBe(true)
    })

    it('returns ERR and fires extractorRegisterFailed when registering the same extractor twice', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()
        const service = createExtractorService(registry, hooks)

        const after = vi.fn()
        const failed = vi.fn()
        hooks.add('afterRegisterExtractor', after)
        hooks.add('extractorRegisterFailed', failed)

        const extractor = createExtractor()

        const first = await service.register(extractor)
        expect(first.ok).toBe(true)

        const second = await service.register(extractor)

        expect(second.ok).toBe(false)
        if (!second.ok) {
            expect(second.error).toBeInstanceOf(OMSSExtractorError)
            expect(second.error.message).toContain('already registered')
        }

        // afterRegisterExtractor must fire only for the real registration, not the duplicate.
        expect(after).toHaveBeenCalledTimes(1)
        expect(failed).toHaveBeenCalledTimes(1)
        expect(registry.extractors).toHaveLength(1)
    })

    it('runs failure hook when registry.add throws', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()

        const failed = vi.fn()

        hooks.add('extractorRegisterFailed', failed)

        vi.spyOn(registry, 'add').mockImplementation(() => {
            throw new Error('boom')
        })

        const service = createExtractorService(registry, hooks)

        const result = await service.register(createExtractor())

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSExtractorError)
            expect(result.error.message).toBe('boom')
        }

        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('runs failure hook when registry.add throws', async () => {
        const registry = createExtractorRegistry()
        const hooks = createHookRegistry<OMSSHooks>()
        const err = new OMSSExtractorError('boom')

        const failed = vi.fn()

        hooks.add('extractorRegisterFailed', failed)

        vi.spyOn(registry, 'add').mockImplementation(() => {
            throw err
        })

        const service = createExtractorService(registry, hooks)

        const result = await service.register(createExtractor())

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSExtractorError)
            expect(result.error).toBe(err)
            expect(result.error.message).toBe('boom')
        }

        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('wraps non-Error throwables', async () => {
        vi.spyOn(registry, 'add').mockImplementation(() => {
            throw 'boom'
        })

        const result = await service.register(createExtractor())

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSExtractorError)
            expect(result.error.message).toBe('boom')
        }
    })

    it('reset clears the registry', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        service.reset()

        expect(registry.extractors).toEqual([])
    })

    it('has returns true for registered extractor', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        expect(service.has(extractor)).toBe(true)
    })

    it('remove removes an extractor', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        expect(service.remove(extractor)).toBe(true)
        expect(registry.has(extractor)).toBe(false)
    })

    it('find returns the first matching extractor', async () => {
        const first = createExtractor(false)
        const second = createExtractor(true)
        const third = createExtractor(true)

        registry.add(first)
        registry.add(second)
        registry.add(third)

        const result = await service.find('https://example.com')

        expect(first.matcher).toHaveBeenCalledWith('https://example.com')
        expect(second.matcher).toHaveBeenCalledWith('https://example.com')
        expect(third.matcher).toHaveBeenCalledWith('https://example.com')

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBe(second)
        }
    })

    it('find returns an error when no extractor matches', async () => {
        registry.add(createExtractor(false))
        registry.add(createExtractor(false))

        const result = await service.find('https://example.com')

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSExtractorError)
            expect(result.error.message).toContain('No extractor found')
        }
    })

    it('find succeeds with the first extractor when multiple match', async () => {
        const first = createExtractor(true)
        const second = createExtractor(true)

        registry.add(first)
        registry.add(second)

        const result = await service.find('https://example.com')

        expect(result.ok).toBe(true)

        if (result.ok) {
            expect(result.value).toBe(first)
        }
    })

    it('find returns an error when registry is empty', async () => {
        const result = await service.find('https://example.com')

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error.message).toContain('No extractor found')
        }
    })

    it('skips an extractor whose matcher rejects and still finds a later match', async () => {
        const broken = { matcher: vi.fn().mockRejectedValue(new Error('boom')), parse: vi.fn() }
        const working = createExtractor(true)

        registry.add(broken)
        registry.add(working)

        const result = await service.find('https://example.com')

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toBe(working)
    })

    it('returns an error (not a rejection) when every extractor matcher rejects', async () => {
        const broken = { matcher: vi.fn().mockRejectedValue(new Error('boom')), parse: vi.fn() }

        registry.add(broken)

        const result = await service.find('https://example.com')

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toBeInstanceOf(OMSSExtractorError)
    })
})
