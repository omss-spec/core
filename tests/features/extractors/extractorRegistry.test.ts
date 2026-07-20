import { beforeEach, describe, expect, it } from 'vitest'
import { ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { createExtractor } from '../../utils.js'

describe('ExtractorRegistry', () => {
    let registry: ExtractorRegistry

    beforeEach(() => {
        registry = new ExtractorRegistry()
    })

    it('starts empty', () => {
        expect(registry.extractors).toEqual([])
    })

    it('adds an extractor', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        expect(registry.extractors).toEqual([extractor])
    })

    it('does not register the same extractor twice', () => {
        const extractor = createExtractor()

        registry.add(extractor)
        registry.add(extractor)

        expect(registry.extractors).toHaveLength(1)
    })

    it('has returns true when extractor is registered', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        expect(registry.has(extractor)).toBe(true)
    })

    it('has returns false when extractor is not registered', () => {
        expect(registry.has(createExtractor())).toBe(false)
    })

    it('removes an existing extractor', () => {
        const extractor = createExtractor()

        registry.add(extractor)

        expect(registry.remove(extractor)).toBe(true)
        expect(registry.has(extractor)).toBe(false)
        expect(registry.extractors).toHaveLength(0)
    })

    it('returns false when removing an unknown extractor', () => {
        expect(registry.remove(createExtractor())).toBe(false)
    })

    it('reset clears all extractors', () => {
        registry.add(createExtractor())
        registry.add(createExtractor())

        registry.reset()

        expect(registry.extractors).toEqual([])
    })
})
