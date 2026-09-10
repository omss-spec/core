import type { OMSSResolver, ParsedOMSSId } from '@/types/resolver.js'
import type { OMSSProviderError } from '@/utils/error.js'
import { type NonEmptyArray, type Result } from '@/types/utils.js'

import { type MiddlewareHandler } from '@/types/middleware.js'
import { type ExtractorService } from '@/features/extractors/ExtractorService.js'

/**
 * Fetches streaming sources for media resolved by a bound resolver.
 *
 * Typically implemented via `defineProvider()` rather than this interface directly.
 *
 * @typeParam P - The resolver this provider is bound to. The return type of
 * `P['resolve']` determines the `meta` parameter shape of `getSources()`.
 */
export interface OMSSProvider<P extends OMSSResolver<unknown>> {
    /**
     * The provider ID. Must be unique.
     */
    readonly id: string

    /**
     * A human-readable provider name.
     */
    readonly name: string

    /**
     * Whether the provider is used during source gathering.
     */
    readonly enabled: boolean

    /**
     * The catalog of media IDs this provider supports, if any.
     *
     * @remarks
     * This is metadata about the provider, not something queried during
     * source resolving. A single `"*"` entry means the provider supports
     * every ID in its resolver's namespace.
     */
    readonly catalog?: () => Promise<NonEmptyArray<string>> | NonEmptyArray<string>

    /**
     * Checks whether this provider supports a given ID.
     *
     * @param id - The parsed OMSS ID to check.
     */
    readonly supportsId: (id: ParsedOMSSId) => boolean | Promise<boolean>

    /**
     * The resolver this provider is bound to.
     */
    readonly resolver: P

    /**
     * Fetches sources for a resolved media item.
     *
     * @param request - The resolved metadata and per-request utilities. The shape of `request.meta` is derived from the resolver's `resolve()` return type.
     * @param result - The result emitter used to report sources, subtitles, diagnostics, and completion.
     * @returns The aggregated result, as produced by `result.done()` or `result.fatal()`.
     */
    getSources(request: ProviderSourcesMeta<ResolverMetadata<P>>, result: ProviderResultEmitter): Promise<ProviderResult>
}

/**
 * Extracts the metadata type produced by a resolver's `resolve()` method.
 *
 * @typeParam R - The resolver to extract the metadata type from.
 */
export type ResolverMetadata<R extends OMSSResolver<unknown>> = Extract<Awaited<ReturnType<R['resolve']>>, { ok: true }> extends { value: infer T } ? T : never

/**
 * The object passed as the first argument to `provider.getSources()`.
 *
 * @typeParam T - The metadata type returned by the provider's bound resolver.
 */
export type ProviderSourcesMeta<T> = {
    utils: {
        /**
         * The parsed OMSS ID of the current request.
         */
        omssId: ParsedOMSSId
        /**
         * The abort signal for the current request. Providers should check this and stop early for long-running requests.
         */
        abortSignal: AbortSignal
        /**
         * Finds a registered {@link Extractor} for a URL, via {@link ExtractorService.find}.
         *
         * @param args - Arguments forwarded to `ExtractorService.find()`.
         */
        findExtractor: (...args: Parameters<ExtractorService['find']>) => ReturnType<ExtractorService['find']>
    }
    /**
     * The metadata returned by the provider's bound resolver.
     */
    meta: T
}

/**
 * A provider bound to an unknown resolver. Used internally by services and
 * registries that don't need the exact resolver metadata type.
 */
export type UnknownProvider = OMSSProvider<OMSSResolver<unknown>>

/**
 * The result of a `provider.getSources()` call.
 */
export type ProviderResult = Result<OMSSProviderResult, OMSSProviderError>

/**
 * The result of a `provider.getSources()` call, once successful.
 */
export interface OMSSProviderResult {
    /**
     * All sources gathered by this provider.
     */
    sources: Source[]
    /**
     * All subtitle tracks gathered by this provider.
     */
    subtitles: Subtitle[]
    /**
     * Non-fatal errors gathered by this provider, alongside any successful sources.
     */
    errors: OMSSProviderError[]
}

/**
 * The result object passed as the second argument to `provider.getSources()`.
 *
 * Created fresh per call via `createProviderResultEmitter()` - see that
 * function for the lifetime/scoping guarantees it provides.
 */
export type ProviderResultEmitter = {
    /**
     * Parsing helpers for building well-formed source/subtitle metadata.
     */
    utils: {
        /**
         * Parsing helpers for source metadata.
         */
        source: {
            /**
             * Parses a string into a source type.
             *
             * @param possibleType - The string to parse (a keyword or file extension).
             * @returns The best-matching {@link SourceTypes} value, defaulting to `"hls"` if nothing matches.
             */
            parseType(possibleType: string): SourceTypes
            /**
             * Parses a string into a source quality.
             *
             * @param possibleQuality - The string to parse (a label, resolution, or bitrate).
             * @returns The best-matching {@link SourceQuality} value, defaulting to `"Auto"` if nothing matches.
             */
            parseQuality(possibleQuality: string): SourceQuality
        }
        /**
         * Parsing helpers for subtitle metadata.
         */
        subtitle: {
            /**
             * Parses a string into a subtitle format.
             *
             * @param possibleFormat - The string to parse (a keyword or file extension).
             * @returns The best-matching {@link SubtitleFormat} value, defaulting to `"vtt"` if nothing matches.
             */
            parseFormat(possibleFormat: string): SubtitleFormat
        }
    }
    /**
     * Emits a custom, provider-defined action/event.
     *
     * @param action - A custom event name (e.g. `"cache.hit"`). Must not contain whitespace or collide with one of this emitter's own method names.
     * @param data - Arbitrary payload associated with the event.
     */
    emit(action: string, data: unknown): void
    /**
     * Logs verbose debug information. Intended for development/troubleshooting only.
     *
     * @param args - Values to log, forwarded as-is (same semantics as `console.debug`).
     */
    debug(...args: unknown[]): void
    /**
     * Logs a general informational message about provider execution (e.g. "Fetched media", "Cache miss, fetching from upstream").
     *
     * @param args - Values to log.
     */
    info(...args: unknown[]): void
    /**
     * Logs a non-fatal warning. Use for degraded-but-recoverable situations (e.g. "missing quality metadata, defaulting to Auto").
     *
     * @param args - Values to log.
     */
    warn(...args: unknown[]): void
    /**
     * Records a non-fatal error and continues provider execution.
     *
     * @remarks
     * Use `fatal()` instead if the provider cannot continue. The error is
     * accumulated and returned alongside any successful sources once
     * `done()` is called, allowing partial success (e.g. "server 2 of 3 failed").
     *
     * @param error - The error to record. Surfaced to the caller of `getSources()`.
     */
    error(error: OMSSProviderError): void

    /**
     * Emits a single resolved source.
     *
     * @param source - The source to emit.
     */
    source(source: Omit<Source, 'provider'>): void
    /**
     * Emits a single subtitle track.
     *
     * @param subtitle - The subtitle to emit.
     */
    subtitle(subtitle: Omit<Subtitle, 'provider'>): void

    /**
     * Immediately aborts provider execution with a fatal error.
     *
     * @param error - The fatal error describing why the provider could not proceed.
     * @returns An `ERR` result wrapping the given error (plus any previously accumulated non-fatal errors).
     * @example
     * ```ts
     * return result.fatal(new OMSSProviderError('upstream unreachable', { cause: err }))
     * ```
     */
    fatal(error: OMSSProviderError): Result<never, OMSSProviderError>
    /**
     * Signals that the provider has finished emitting sources/subtitles and finalizes the result.
     *
     * @remarks
     * The return value must be returned from `getSources()` - this is what
     * turns everything emitted so far into the final {@link ProviderResult}.
     *
     * @returns An `OK` result containing all accumulated sources, subtitles, and non-fatal errors for this execution.
     * @example
     * ```ts
     * return result.done()
     * ```
     */
    done(): ProviderResult
}

/**
 * Fields shared by every {@link Source} variant.
 */
export interface BaseSource {
    /**
     * The original streaming source URL from the provider. May require CORS handling or custom headers (see `header`).
     */
    url: string
    /**
     * HTTP (and non-standard HTTP) headers required when accessing `url`.
     */
    header: Record<string, string>
    /**
     * Whether the source is streamable (`true`) or a direct download link (`false`).
     *
     * @remarks
     * If `false`, clients must treat the URL as a download link rather than
     * a streaming source - download links cannot be used as streaming sources.
     * @see [MDN Range Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range#:~:text=A%20server%20that%20doesn%27t%20support%20range%20requests%20may%20ignore%20the%20Range%20header%20and%20return%20the%20whole%20resource%20with%20a%20200%20status%20code.)
     */
    streamable: boolean
    /**
     * The source type - see {@link SourceTypes}.
     */
    type: SourceTypes
    /**
     * The video quality - see {@link SourceQuality}.
     *
     * @remarks
     * Should be inferred from the best available metadata, prioritizing
     * resolution, then bitrate, filename, or manifest information. Use
     * `"Auto"` if quality cannot be determined. Resolution ranges:
     * 4320p+ → 8K, 2160p–4319p → 4K, 1440p–2159p → QHD, 1080p–1439p → FHD,
     * 720p–1079p → HD, below 720p → SD.
     */
    quality: SourceQuality
    /**
     * The provider that produced this source.
     */
    provider: { id: string; name: string }
}

/**
 * A source with at least one known language baked into the stream itself
 * (e.g. audio muxed into the HLS/DASH manifest or MP4/MKV file).
 */
interface SourceWithLanguages extends BaseSource {
    /**
     * Human-readable language name(s) actually available in this specific source. Use `"Original"` if the language is unknown/default.
     *
     * @remarks
     * If the source contains no muxed-in audio (video-only), keep this
     * array empty and provide `audioTracks` instead.
     */
    languages: NonEmptyArray<string>
    audioTracks?: never
}

/**
 * A source with no muxed-in audio at all (e.g. a video-only stream). Must
 * provide at least one separate {@link AudioTrack} instead.
 */
interface SourceWithAudioTracks extends BaseSource {
    languages?: never
    /**
     * The separate audio tracks available for this source.
     */
    audioTracks: NonEmptyArray<AudioTrack>
}

/**
 * A streaming source. Must declare at least one muxed-in language OR at
 * least one separate audio track (both may be present).
 *
 * @see [OMSS spec §6.2 Source Object](https://github.com/omss-spec/omss-spec/blob/main/spec/v1.1/omss-v1.1.md#62-source-object)
 */
export type Source = SourceWithLanguages | SourceWithAudioTracks

/**
 * Valid source container/stream types.
 */
export type SourceTypes = 'hls' | 'mp4' | 'dash' | 'mkv'

/**
 * Video quality tiers, from lowest to highest resolution.
 */
export type SourceQuality = '8K' | '4K' | 'QHD' | 'FHD' | 'HD' | 'SD' | 'Auto'

/**
 * A subtitle track.
 *
 * @see [OMSS spec §6.3 Subtitle Object](https://github.com/omss-spec/omss-spec/blob/main/spec/v1.1/omss-v1.1.md#63-subtitle-object)
 */
export interface Subtitle {
    /**
     * The original subtitle URL from the provider. May require CORS handling or custom headers (see `header`).
     */
    url: string
    /**
     * HTTP (and non-standard HTTP) headers required when accessing `url`.
     */
    header: Record<string, string>
    /**
     * Human-readable language name for the subtitle track. Use `"Unknown"` if not known.
     */
    label: string
    /**
     * The subtitle format - see {@link SubtitleFormat}.
     */
    format: SubtitleFormat
    /**
     * The provider that produced this subtitle track.
     */
    provider: { id: string; name: string }
}

/**
 * Valid subtitle formats.
 */
export type SubtitleFormat = 'vtt' | 'srt'

/**
 * A separate audio track, used when a source has no muxed-in audio.
 *
 * @see [OMSS spec §6.2 Source Object](https://github.com/omss-spec/omss-spec/blob/main/spec/v1.1/omss-v1.1.md#62-source-object:~:text=Unknown%20%E2%86%92%20Auto-,audioTracks,-(array%20of%20strings)
 * @see [omss-spec#8](https://github.com/omss-spec/omss-spec/issues/8)
 */
export interface AudioTrack {
    /**
     * The original audio track URL from the provider. May require CORS handling or custom headers (see `header`).
     */
    url: string
    /**
     * HTTP (and non-standard HTTP) headers required when accessing `url`.
     */
    header: Record<string, string>
    /**
     * Human-readable language name for the audio track. Use `"Unknown"` if not known.
     */
    label: string
}

/**
 * The source shape accepted by `result.source()` - a {@link Source} without the `provider` field, which the emitter fills in automatically.
 */
export type EmittedSource = Omit<SourceWithLanguages, 'provider'> | Omit<SourceWithAudioTracks, 'provider'>

/**
 * The subtitle shape accepted by `result.subtitle()` - a {@link Subtitle} without the `provider` field, which the emitter fills in automatically.
 */
export type EmittedSubtitle = Omit<Subtitle, 'provider'>

/**
 * Operations supported by {@link ProviderService}'s middleware runner, with their context and result types.
 */
export type ProviderServiceOperations = {
    /**
     * The provider registration pipeline.
     *
     * Middleware runs after `beforeProviderRegister` and before
     * `ProviderRegistry.add()`. Context carries the provider being registered.
     */
    register: {
        context: { provider: UnknownProvider }
        result: Result<UnknownProvider, OMSSProviderError>
    }
}

/**
 * Middleware function for a {@link ProviderService} operation.
 */
export type ProviderServiceMiddleware<TMethod extends keyof ProviderServiceOperations> = MiddlewareHandler<ProviderServiceOperations, TMethod>
