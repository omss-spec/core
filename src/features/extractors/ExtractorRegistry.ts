import { type Extractor } from '@/types/extractor.js'

/**
 * Extractor Registry
 *
 * Manages all extractors.
 */
export interface ExtractorRegistry {
    /**
     * Get all extractors.
     */
    readonly extractors: Readonly<Extractor[]>

    /**
     * Clear all extractors.
     */
    reset(): void

    /**
     * Add an extractor.
     * @param extractor - Extractor to add.
     */
    add(extractor: Extractor): void

    /**
     * Check if an extractor is already registered.
     * @param extractor - Extractor to check.
     */
    has(extractor: Extractor): boolean

    /**
     * Remove an extractor.
     * @param extractor - Extractor to remove.
     * @returns True if the extractor was removed, false otherwise.
     */
    remove(extractor: Extractor): boolean
}

/**
 * Creates a new {@link ExtractorRegistry}.
 */
export function createExtractorRegistry(): ExtractorRegistry {
    /**
     * Array of extractors.
     */
    const extractors = Array<Extractor>()

    return {
        get extractors() {
            return extractors
        },

        reset() {
            extractors.length = 0
        },

        add(extractor) {
            if (extractors.some((e) => e === extractor)) return

            extractors.push(extractor)
        },

        has(extractor) {
            return extractors.includes(extractor)
        },

        remove(extractor) {
            if (!extractors.includes(extractor)) return false
            extractors.splice(extractors.indexOf(extractor), 1)
            return true
        },
    }
}
