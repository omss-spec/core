import {
    EmittedSource,
    EmittedSubtitle,
    OMSSProviderResult,
    ProviderResult,
    ProviderResultEmitter,
    Source,
    SourceQuality,
    SourceTypes,
    Subtitle,
    SubtitleFormat,
    UnknownProvider,
} from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { ProviderHooks } from '@/types/hooks.js'
import { DASH_REGEX, HLS_REGEX, MKV_REGEX, MP4_REGEX, SRT_REGEX, VTT_REGEX } from '@/utils/regexp.js'
import { CleaningFunction } from '@/types/source.js'

/**
 * Creates a fresh `ProviderResultEmitter` instance scoped to a single
 * `getSources()` execution.
 *
 * A new emitter MUST be created per provider call. Emitters hold internal,
 * mutable state (accumulated sources/subtitles/errors) via closures, so
 * reusing a single emitter across concurrent provider executions would
 * cause data from one provider to leak into another's response.
 *
 * @param provider - The provider instance for which this emitter is being created.
 * @param hookReg - The hook registry instance for managing hooks.
 * @param cleaningFunc - A function to clean up source/subtitle URLs and headers.
 * @returns A new `ProviderResultEmitter` bound to this execution.
 *
 */
export function createProviderResultEmitter(provider: Readonly<UnknownProvider>, hookReg: HookRegistry<ProviderHooks>, cleaningFunc: CleaningFunction): ProviderResultEmitter {
    /**
     * Accumulated sources emitted via `source()` during this execution.
     * Flushed into the final result when `done()` is called.
     */
    const sources: Source[] = []

    /**
     * Accumulated subtitles emitted via `subtitle()` during this execution.
     * Subtitles are intentionally NOT linked to any source or audio track,
     * so they live in their own flat array regardless of how many sources
     * were emitted.
     */
    const subtitles: Subtitle[] = []

    /**
     * Accumulated NON-fatal errors emitted via `error()` during this execution.
     * These are returned alongside successful results (via `done()`) so
     * that partial failures (e.g. "server 2 of 3 failed") don't discard
     * otherwise-valid sources.
     */
    const errors: OMSSProviderError[] = []

    return {
        /**
         * Utilities to make your life easier
         */
        utils: {
            /**
             * Utilities for parsing metadata of sources
             */
            source: {
                /**
                 * Parse a string into a possible source type.
                 * @param possibleType - The string to parse
                 */
                parseType(possibleType: string): SourceTypes {
                    if (HLS_REGEX.test(possibleType)) {
                        return 'hls'
                    } else if (MP4_REGEX.test(possibleType)) {
                        return 'mp4'
                    } else if (DASH_REGEX.test(possibleType)) {
                        return 'dash'
                    } else if (MKV_REGEX.test(possibleType)) {
                        return 'mkv'
                    } else {
                        // most commonly used is hls
                        return 'hls'
                    }
                },
                /**
                 * Parse a string into a possible source quality.
                 * @param possibleQuality - The string to parse
                 */
                parseQuality(possibleQuality: string): SourceQuality {
                    if (!possibleQuality) {
                        return 'Auto'
                    }

                    const value = possibleQuality.toLowerCase().trim().replace(/_/g, ' ').replace(/-/g, ' ')

                    // Direct quality labels / aliases
                    if (/\b(8k|uhd\s*8k|4320p)\b/.test(value)) {
                        return '8K'
                    }

                    if (/\b(4k|uhd|ultra\s*hd|2160p)\b/.test(value)) {
                        return '4K'
                    }

                    if (/\b(qhd|2k|1440p|2560x1440)\b/.test(value)) {
                        return 'QHD'
                    }

                    if (/\b(fhd|full\s*hd|1080p|1920x1080)\b/.test(value)) {
                        return 'FHD'
                    }

                    if (/\b(hd|720p|1280x720)\b/.test(value)) {
                        return 'HD'
                    }

                    if (/\b(sd|480p|576p|360p|240p)\b/.test(value)) {
                        return 'SD'
                    }

                    const resolutionMatch = value.match(/(\d{3,4})(?:p|x\d{3,4})?/)

                    if (resolutionMatch) {
                        const resolution = Number(resolutionMatch[1])

                        if (resolution >= 4320) {
                            return '8K'
                        }

                        if (resolution >= 2160) {
                            return '4K'
                        }

                        if (resolution >= 1440) {
                            return 'QHD'
                        }

                        if (resolution >= 1080) {
                            return 'FHD'
                        }

                        if (resolution >= 720) {
                            return 'HD'
                        }

                        if (resolution > 0) {
                            return 'SD'
                        }
                    }

                    const bitrateMatch = value.match(/(\d+(?:\.\d+)?)\s*(mbps|kbps)/)

                    if (bitrateMatch) {
                        const bitrate = Number(bitrateMatch[1])
                        const unit = bitrateMatch[2]

                        const mbps = unit === 'kbps' ? bitrate / 1000 : bitrate

                        if (mbps >= 25) {
                            return '4K'
                        }

                        if (mbps >= 8) {
                            return 'FHD'
                        }

                        if (mbps >= 3) {
                            return 'HD'
                        }

                        return 'SD'
                    }

                    return 'Auto'
                },
            },
            /**
             * Utilities for parsing metadata of subtitles
             */
            subtitle: {
                /**
                 * Parse a string into a possible subtitle format.
                 * @param possibleFormat - The string to parse
                 */
                parseFormat(possibleFormat: string): SubtitleFormat {
                    if (VTT_REGEX.test(possibleFormat)) {
                        return 'vtt'
                    } else if (SRT_REGEX.test(possibleFormat)) {
                        return 'srt'
                    } else {
                        return 'vtt'
                    }
                },
            },
        },

        /**
         * Emits a custom, provider-defined action/event.
         *
         * @param action - A custom event name (e.g. "cache.hit").
         * @param data - Arbitrary payload associated with the event.
         */
        emit(action: string, data: unknown): void {
            // action cannot be whitespace or another hook name
            if (/\s/.test(action) || Object.keys(this).includes(action)) {
                return
            }
            hookReg.run(action, { data, provider })
        },

        /**
         * Logs verbose debug information. Intended for development/troubleshooting
         * only and should be stripped or gated behind a debug flag in production.
         *
         * @param args - Values to log, forwarded as-is (same semantics as `console.debug`).
         */
        debug(...args: unknown[]): void {
            hookReg.run('debug', { provider, args })
        },

        /**
         * Logs general informational messages about provider execution
         * (e.g. "Fetched media", "Cache miss, fetching from upstream").
         *
         * @param args - Values to log.
         */
        info(...args: unknown[]): void {
            hookReg.run('info', { provider, args })
        },

        /**
         * Logs a non-fatal warning. Use this for degraded-but-recoverable
         * situations (e.g. "missing quality metadata, defaulting to Auto").
         *
         * @param args - Values to log.
         */
        warn(...args: unknown[]): void {
            hookReg.run('warn', { provider, args })
        },

        /**
         * Records a NON-fatal error. The provider continues executing after
         * calling this — use `fatal()` instead if the provider cannot continue.
         *
         * The error is accumulated and returned to the requestor as part of
         * the `diagnostics`/`errors` field once `done()` is called, allowing
         * partial success (e.g. some sources found despite one upstream
         * server failing).
         *
         * @param error - The error to record. Will be surfaced to the client.
         */
        error(error: OMSSProviderError): void {
            errors.push(error)
            hookReg.run('error', { provider, error })
        },

        /**
         * Emits a single resolved source.
         *
         * @param source - The fully-formed source object to emit.
         */
        source(source: EmittedSource): void {
            const cleanedSource = {
                ...source,
            }

            const cleaned = cleaningFunc({
                url: cleanedSource.url,
                header: cleanedSource.header,
            })

            cleanedSource.url = cleaned.url
            cleanedSource.header = cleaned.header

            if ('audioTracks' in cleanedSource && cleanedSource.audioTracks) {
                // had to split first and rest, since audioTracks requires least one track.
                const [first, ...rest] = cleanedSource.audioTracks

                cleanedSource.audioTracks = [
                    {
                        ...first,
                        ...cleaningFunc({
                            url: first.url,
                            header: first.header,
                        }),
                    },
                    ...rest.map((track) => ({
                        ...track,
                        ...cleaningFunc({
                            url: track.url,
                            header: track.header,
                        }),
                    })),
                ]
            }
            const fullSource: Source = {
                ...cleanedSource,
                provider: {
                    id: provider.id,
                    name: provider.name,
                },
            }

            sources.push(fullSource)

            hookReg.run('source', {
                provider,
                source: fullSource,
            })
        },

        /**
         * Emits a single subtitle track.
         *
         * @param subtitle - The subtitle object to emit.
         */
        subtitle(subtitle: EmittedSubtitle): void {
            const obj = {
                url: subtitle.url,
                header: subtitle.header,
            }
            const { url, header } = cleaningFunc(obj)
            subtitle.url = url
            subtitle.header = header
            const fullSub = { ...subtitle, provider: { id: provider.id, name: provider.name } }
            subtitles.push(fullSub)
            hookReg.run('subtitle', { provider, subtitle: fullSub })
        },

        /**
         * Immediately aborts provider execution with a fatal error.
         *
         * @param error - The fatal error describing why the provider could not proceed.
         * @returns An `ERR` result wrapping the given error.
         */
        fatal(error: OMSSProviderError): Result<never, OMSSProviderError> {
            const accumulatedError = new AggregateError([error, ...errors], error.message, { cause: error.cause })

            const finalErr = new OMSSProviderError(accumulatedError.message, { cause: accumulatedError })

            hookReg.run('error', { provider, error: finalErr })

            return ERR(finalErr)
        },

        /**
         * Signals that the provider has finished emitting sources/subtitles
         * and finalizes the result.
         *
         * @returns An `OK` result containing all accumulated sources,
         *          subtitles, and non-fatal errors for this execution.
         */
        done(): ProviderResult {
            const result: OMSSProviderResult = {
                sources,
                subtitles,
                errors,
            }

            hookReg.run('done', { provider, result })

            return OK(result)
        },
    }
}
