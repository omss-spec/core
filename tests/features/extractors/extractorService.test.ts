import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { ExtractorService } from '@/features/extractors/ExtractorService.js'
import { OMSSExtractorError } from '@/utils/error.js'
import { createExtractor } from '../../utils.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { OMSSHooks } from '@/types/hooks.js'

describe('ExtractorService', () => {
    let registry: ExtractorRegistry
    let service: ExtractorService

    beforeEach(() => {
        registry = new ExtractorRegistry()
        service = new ExtractorService(registry, new HookRegistry<OMSSHooks>())
    })

    it('returns all registered extractors', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        const result = service.extractors

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual([extractor])
        }
    })

    it('register adds an extractor', async () => {
        const extractor = createExtractor()

        const result = await service.register(extractor)

        expect(result.ok).toBe(true)
        expect(registry.has(extractor)).toBe(true)
    })

    it('runs hooks around successful extractor registration', async () => {
        const registry = new ExtractorRegistry()
        const hooks = new HookRegistry<OMSSHooks>()

        const before = vi.fn()
        const after = vi.fn()

        hooks.add('beforeRegisterExtractor', before)
        hooks.add('afterRegisterExtractor', after)

        const service = new ExtractorService(registry, hooks)

        const extractor = createExtractor()

        const result = await service.register(extractor)

        expect(result.ok).toBe(true)
        expect(before).toHaveBeenCalledTimes(1)
        expect(after).toHaveBeenCalledTimes(1)
    })

    it('runs hooks around successful extractor lookup', async () => {
        const registry = new ExtractorRegistry()
        const hooks = new HookRegistry<OMSSHooks>()

        const before = vi.fn()
        const after = vi.fn()

        hooks.add('beforeFindExtractor', before)
        hooks.add('afterFindExtractor', after)

        const extractor = createExtractor(true)
        registry.add(extractor)

        const service = new ExtractorService(registry, hooks)

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
        const registry = new ExtractorRegistry()
        const hooks = new HookRegistry<OMSSHooks>()

        const failed = vi.fn()

        hooks.add('findExtractorFailed', failed)

        registry.add(createExtractor(false))

        const service = new ExtractorService(registry, hooks)

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
        const registry = new ExtractorRegistry()
        const hooks = new HookRegistry<OMSSHooks>()

        const service = new ExtractorService(registry, hooks)

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

    it('runs failure hook when registry.add throws', async () => {
        const registry = new ExtractorRegistry()
        const hooks = new HookRegistry<OMSSHooks>()

        const failed = vi.fn()

        hooks.add('extractorRegisterFailed', failed)

        vi.spyOn(registry, 'add').mockImplementation(() => {
            throw new Error('boom')
        })

        const service = new ExtractorService(registry, hooks)

        const result = await service.register(createExtractor())

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.error).toBeInstanceOf(OMSSExtractorError)
            expect(result.error.message).toBe('boom')
        }

        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('runs failure hook when registry.add throws', async () => {
        const registry = new ExtractorRegistry()
        const hooks = new HookRegistry<OMSSHooks>()
        const err = new OMSSExtractorError('boom')

        const failed = vi.fn()

        hooks.add('extractorRegisterFailed', failed)

        vi.spyOn(registry, 'add').mockImplementation(() => {
            throw err
        })

        const service = new ExtractorService(registry, hooks)

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

        const result = service.reset()

        expect(result.ok).toBe(true)
        expect(registry.extractors).toEqual([])
    })

    it('has returns true for registered extractor', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        const result = service.has(extractor)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBe(true)
        }
    })

    it('remove removes an extractor', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        const result = service.remove(extractor)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBe(true)
        }

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
})
