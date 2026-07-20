import { ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { Extractor } from '@/types/extractor.js'
import { Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'
import { OMSSExtractorError } from '@/utils/error.js'

export class ExtractorService {
    readonly #extractorRegistry: ExtractorRegistry

    constructor(extractorRegistry: ExtractorRegistry) {
        this.#extractorRegistry = extractorRegistry
    }

    /**
     * Get all extractors (read-only).
     */
    get extractors(): Result<Readonly<Array<Extractor>>, Error> {
        return OK(this.#extractorRegistry.extractors)
    }

    /**
     * Find an extractor that can handle the given URL.
     * @param url - URL to find an extractor for.
     * @returns The first matching extractor if found, otherwise an OMSSExtractorError.
     */
    async find(url: string): Promise<Result<Extractor, OMSSExtractorError>> {
        const extractors = this.#extractorRegistry.extractors

        const results = await Promise.all(extractors.map((extractor) => extractor.matcher(url)))

        const pairs = extractors.map((extractor, i) => ({
            extractor,
            result: results[i]!,
        }))

        for (const { extractor, result } of pairs) {
            if (result.ok) {
                return OK(extractor)
            }
        }

        return ERR(new OMSSExtractorError(`No extractor found for URL "${url}"`))
    }

    /**
     * Add an extractor.
     * @param extractor - Extractor to add.
     */
    register(extractor: Extractor): Result<void, Error> {
        this.#extractorRegistry.add(extractor)
        return OK()
    }

    /**
     * Clear all extractors.
     */
    reset(): Result<void, Error> {
        this.#extractorRegistry.reset()
        return OK()
    }

    /**
     * Check if an extractor is already registered.
     * @param extractor - Extractor to check.
     * @returns True if the extractor is registered, false otherwise.
     */
    has(extractor: Extractor): Result<boolean, Error> {
        return OK(this.#extractorRegistry.has(extractor))
    }

    /**
     * Remove an extractor.
     * @param extractor - Extractor to remove.
     * @returns True if the extractor was removed, false otherwise.
     */
    remove(extractor: Extractor): Result<boolean, Error> {
        return OK(this.#extractorRegistry.remove(extractor))
    }
}
