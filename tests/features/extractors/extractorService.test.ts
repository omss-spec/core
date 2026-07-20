import { beforeEach, describe, expect, it } from 'vitest'
import { ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { ExtractorService } from '@/features/extractors/ExtractorService.js'
import { OMSSExtractorError } from '@/utils/error.js'
import { createExtractor } from '../../utils.js'

describe('ExtractorService', () => {
    let registry: ExtractorRegistry
    let service: ExtractorService

    beforeEach(() => {
        registry = new ExtractorRegistry()
        service = new ExtractorService(registry)
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

    it('register adds an extractor', () => {
        const extractor = createExtractor()

        const result = service.register(extractor)

        expect(result.ok).toBe(true)
        expect(registry.has(extractor)).toBe(true)
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
