import { type ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'
import { type HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { OMSSHooks } from '@/types/hooks.js'
import { type Extractor } from '@/types/extractor.js'
import { type Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'
import { OMSSExtractorError } from '@/utils/error.js'

/**
 * The public API for managing OMSS extractors.
 */
export interface ExtractorService {
    /**
     * Get all registered extractors (read-only).
     */
    readonly extractors: ReadonlyArray<Extractor>

    /**
     * Finds an extractor capable of handling the given URL.
     *
     * @param url - The URL to search for.
     * @returns The first matching {@link Extractor}, or an {@link OMSSExtractorError} if none match.
     */
    find(url: string): Promise<Result<Extractor, OMSSExtractorError>>

    /**
     * Registers an extractor.
     *
     * @param extractor - The extractor to register.
     * @returns `OK` if registration succeeded, or an error if it failed.
     */
    register(extractor: Extractor): Promise<Result<void, OMSSExtractorError>>

    /**
     * Remove every registered extractor.
     */
    reset(): void

    /**
     * Determine whether an extractor has already been registered.
     *
     * @param extractor - Extractor to check.
     */
    has(extractor: Extractor): boolean

    /**
     * Remove an extractor.
     *
     * @param extractor - Extractor to remove.
     * @returns Whether the extractor was removed.
     */
    remove(extractor: Extractor): boolean
}

/**
 * Creates a new {@link ExtractorService}.
 *
 * @param extractorRegistry - The extractor registry to wrap.
 * @param hookRegistry - The hook registry used to dispatch extractor lifecycle hooks.
 */
export function createExtractorService(extractorRegistry: ExtractorRegistry, hookRegistry: HookRegistry<OMSSHooks>): ExtractorService {
    let insideBeforeRegisterExtractor = false

    return {
        get extractors() {
            return extractorRegistry.extractors
        },

        async find(url) {
            await hookRegistry.run('beforeFindExtractor', { url })

            const extractors = extractorRegistry.extractors

            const matches = await Promise.all(extractors.map(async (extractor) => ({ extractor, result: await extractor.matcher(url) })))

            for (const { extractor, result } of matches) {
                if (result.ok) {
                    await hookRegistry.run('afterFindExtractor', {
                        url,
                        extractor,
                    })

                    return OK(extractor)
                }
            }

            const error = new OMSSExtractorError(`No extractor found for URL "${url}"`)

            await hookRegistry.run('findExtractorFailed', {
                url,
                error,
            })

            return ERR(error)
        },

        async register(extractor) {
            if (insideBeforeRegisterExtractor) {
                return ERR(new OMSSExtractorError('Extractors cannot be registered during beforeRegisterExtractor'))
            }

            insideBeforeRegisterExtractor = true

            try {
                await hookRegistry.run('beforeRegisterExtractor', {
                    extractor,
                })
            } finally {
                insideBeforeRegisterExtractor = false
            }

            try {
                extractorRegistry.add(extractor)
            } catch (error) {
                const extractorError = error instanceof OMSSExtractorError ? error : new OMSSExtractorError(error instanceof Error ? error.message : String(error))

                await hookRegistry.run('extractorRegisterFailed', {
                    extractor,
                    error: extractorError,
                })

                return ERR(extractorError)
            }

            await hookRegistry.run('afterRegisterExtractor', {
                extractor,
            })

            return OK()
        },

        reset() {
            extractorRegistry.reset()
        },

        has(extractor) {
            return extractorRegistry.has(extractor)
        },

        remove(extractor) {
            return extractorRegistry.remove(extractor)
        },
    }
}
