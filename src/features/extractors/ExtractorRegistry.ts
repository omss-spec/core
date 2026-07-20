import { Extractor } from '@/types/extractor.js'

/**
 * Extractor Registry
 *
 * Manages all extractors.
 */
export class ExtractorRegistry {
    /**
     * Array of extractors.
     */
    readonly #extractors = Array<Extractor>()

    /**
     * Get all extractors.
     */
    get extractors(): Readonly<Extractor[]> {
        return this.#extractors
    }

    /**
     * Clear all extractors.
     */
    reset(): void {
        this.#extractors.length = 0
    }

    /**
     * Add an extractor.
     * @param extractor - Extractor to add.
     */
    add(extractor: Extractor): void {
        if (this.#extractors.some((e) => e === extractor)) return

        this.#extractors.push(extractor)
    }

    /**
     * Check if an extractor is already registered.
     * @param extractor - Extractor to check.
     */
    has(extractor: Extractor): boolean {
        return this.#extractors.includes(extractor)
    }

    /**
     * Remove an extractor.
     * @param extractor - Extractor to remove.
     * @returns True if the extractor was removed, false otherwise.
     */
    remove(extractor: Extractor): boolean {
        if (!this.has(extractor)) return false
        this.#extractors.splice(this.#extractors.indexOf(extractor), 1)
        return true
    }
}
