import { ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { OMSSHooks } from '@/types/hooks.js'
import { Extractor } from '@/types/extractor.js'
import { Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'
import { OMSSExtractorError } from '@/utils/error.js'

export class ExtractorService {
    readonly #extractorRegistry: ExtractorRegistry
    readonly #hookRegistry: HookRegistry<OMSSHooks>
    #insideBeforeRegisterExtractor = false

    constructor(extractorRegistry: ExtractorRegistry, hookRegistry: HookRegistry<OMSSHooks>) {
        this.#extractorRegistry = extractorRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Get all registered extractors (read-only).
     */
    get extractors(): Result<ReadonlyArray<Extractor>, Error> {
        return OK(this.#extractorRegistry.extractors)
    }

    /**
     * Find an extractor capable of handling the given URL.
     *
     * @param url - URL to search for.
     * @returns The first matching {@link Extractor} or an {@link OMSSExtractorError}.
     */
    async find(url: string): Promise<Result<Extractor, OMSSExtractorError>> {
        await this.#hookRegistry.run('beforeFindExtractor', { url })

        const extractors = this.#extractorRegistry.extractors

        const results = await Promise.all(extractors.map((extractor) => extractor.matcher(url)))

        for (let i = 0; i < extractors.length; i++) {
            if (results[i]!.ok) {
                const extractor = extractors[i]!

                await this.#hookRegistry.run('afterFindExtractor', {
                    url,
                    extractor,
                })

                return OK(extractor)
            }
        }

        const error = new OMSSExtractorError(`No extractor found for URL "${url}"`)

        await this.#hookRegistry.run('findExtractorFailed', {
            url,
            error,
        })

        return ERR(error)
    }

    /**
     * Register an extractor.
     *
     * @param extractor - Extractor to register.
     */
    async register(extractor: Extractor): Promise<Result<void, Error>> {
        if (this.#insideBeforeRegisterExtractor) {
            return ERR(new OMSSExtractorError('Extractors cannot be registered during beforeRegisterExtractor'))
        }

        this.#insideBeforeRegisterExtractor = true

        try {
            await this.#hookRegistry.run('beforeRegisterExtractor', {
                extractor,
            })
        } finally {
            this.#insideBeforeRegisterExtractor = false
        }

        try {
            this.#extractorRegistry.add(extractor)
        } catch (error) {
            const extractorError = error instanceof OMSSExtractorError ? error : new OMSSExtractorError(error instanceof Error ? error.message : String(error))

            await this.#hookRegistry.run('extractorRegisterFailed', {
                extractor,
                error: extractorError,
            })

            return ERR(extractorError)
        }

        await this.#hookRegistry.run('afterRegisterExtractor', {
            extractor,
        })

        return OK()
    }

    /**
     * Remove every registered extractor.
     */
    reset(): Result<void, Error> {
        this.#extractorRegistry.reset()
        return OK()
    }

    /**
     * Determine whether an extractor has already been registered.
     *
     * @param extractor - Extractor to check.
     */
    has(extractor: Extractor): Result<boolean, Error> {
        return OK(this.#extractorRegistry.has(extractor))
    }

    /**
     * Remove an extractor.
     *
     * @param extractor - Extractor to remove.
     * @returns Whether the extractor was removed.
     */
    remove(extractor: Extractor): Result<boolean, Error> {
        return OK(this.#extractorRegistry.remove(extractor))
    }
}
