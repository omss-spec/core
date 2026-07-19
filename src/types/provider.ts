import type { ParsedOMSSId } from '@/types/resolver.js'
import type { BaseResolver } from '@/features/resolvers/BaseResolver.js'
import type { OMSSProviderError } from '@/utils/error.js'
import { NonEmptyArray, Result } from '@/types/utils.js'
import { HeadersInit } from 'undici-types/fetch.js'

/**
 * Core provider interface.
 *
 * @typeParam P - The resolver class this provider is bound to.
 *               The return type of P['resolve'] determines the `meta`
 *               parameter shape of getSources().
 */
export interface OMSSProvider<P extends BaseResolver<unknown>> {
    /** Provider ID. Must be unique. */
    readonly id: string

    /** Friendly name of the provider. */
    readonly name: string

    /** Whether the provider will be used. */
    readonly enabled: boolean

    /**
     * Catalog of media this provider supports. It does not have to exist. If it does, it should be a list of media IDs.
     * This does not get queried for source resolving, but more metadata about the provider.
     */
    readonly catalog?: () => Promise<string[]> | string[]
    // TODO: implement the catalog

    /**
     * Provide a method that checks whether this provider supports a certain ID.
     * @param id - Parsed OMSS ID
     */
    readonly supportsId: (id: ParsedOMSSId) => boolean | Promise<boolean>
    // todo: call the supports id before run

    /** Resolver that this provider is bound to. */
    readonly resolver: P

    /**
     * Fetch sources for a certain media.
     * The shape of `media.meta` is derived from the resolver's resolve() return type.
     */
    getSources(media: ProviderSourcesMeta<ResolverMetadata<P>>, result: ProviderResultEmitter): Promise<ProviderResult>
}

/**
 * Extract the metadata type from a resolver's resolve method.
 */
export type ResolverMetadata<R extends BaseResolver<unknown>> = Extract<Awaited<ReturnType<R['resolve']>>, { ok: true }> extends { value: infer T } ? T : never

/**
 * The object passed to providers when they are executed.
 */
export type ProviderSourcesMeta<T> = {
    utils: {
        /**
         * The parsed OMSS ID of the current request.
         */
        omssId: ParsedOMSSId
        /**
         * The abort controller signal for the current request. Providers can check this to abort the request early (recommended for long running requests).
         */
        abortSignal: AbortSignal
    }
    /** Metadata returned by the resolver */
    meta: T
}

/**
 * Provider with an unknown resolver. Utils for other services and registries
 */
export type UnknownProvider = OMSSProvider<BaseResolver<unknown>>

/**
 * The result of a provider getSources call.
 */
export type ProviderResult = Result<OMSSProviderResult, OMSSProviderError>

/**
 * The result of a provider getSources call if successful.
 */
export interface OMSSProviderResult {
    /**
     * Array of sources.
     */
    sources: Source[]
    /**
     * Array of subtitle tracks.
     */
    subtitles: Subtitle[]
    /**
     * Array of errors.
     */
    errors: OMSSProviderError[]
}

// todo: maybe make abortcontroller checks in here.
/**
 * The result object passed to the provider's getSources() method.
 */
export type ProviderResultEmitter = {
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
            parseType(possibleType: string): SourceTypes
            /**
             * Parse a string into a possible source quality.
             * @param possibleQuality - The string to parse
             */
            parseQuality(possibleQuality: string): SourceQuality
        }
        /**
         * Utilities for parsing metadata of subtitles
         */
        subtitle: {
            /**
             * Parse a string into a possible subtitle format.
             * @param possibleFormat - The string to parse
             */
            parseFormat(possibleFormat: string): SubtitleFormat
        }
    }
    /**
     * Method for custom logging
     * @param action - The action to log
     * @param data - The data to log
     */
    emit(action: string, data: unknown): void
    /**
     * Method for debug logging
     * @param args - Arguments to log
     */
    debug(...args: unknown[]): void
    /**
     * Method for information logging
     * @param args - Arguments to log
     */
    info(...args: unknown[]): void
    /**
     * Method for warning logging
     * @param args - Arguments to log
     */
    warn(...args: unknown[]): void
    /**
     * Method for error logging. Not fatal.
     * @param error - The error to log. This will be returned to the requestor
     */
    error(error: OMSSProviderError): void

    /**
     * Method to emit a source.
     * @param source - The source to emit
     */
    source(source: Source): void
    // todo: remove the provider prop from the call. the emitter knows the provider already. no need to pass it again.
    /**
     * Method to emit a subtitle.
     * @param subtitle - The subtitle to emit
     */
    subtitle(subtitle: Subtitle): void

    /**
     * Method to emit a fatal error. This will stop the provider from executing.
     * @param error - The error to emit
     * @example
     * ```typescript
     * return result.fatal(new OMSSProviderError("Error Message", {cause: optionalObject}))
     * ```
     */
    fatal(error: OMSSProviderError): Result<never, OMSSProviderError>
    /**
     * Signal that the provider has finished processing.
     * @important Return the return value of this method.
     * @example
     * ```typescript
     * return result.done()
     * ```
     */
    done(): ProviderResult
}

export interface BaseSource {
    /**
     * A string representing the original URL to the streaming source from the provider, which may require CORS handling or custom headers (provided in the headers field).
     */
    url: string
    /**
     * Key-value pairs of HTTP (and non-standard HTTP) headers that should be included when accessing the source URL.
     */
    header: HeadersInit
    /**
     * Indicates if the source is streamable (true) or a direct download link (false). If false, clients must treat the URL as a download link rather than a streaming source. Download links CANNOT be used as streaming sources.
     * @see [MDN Range Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range#:~:text=A%20server%20that%20doesn%27t%20support%20range%20requests%20may%20ignore%20the%20Range%20header%20and%20return%20the%20whole%20resource%20with%20a%20200%20status%20code.)
     */
    streamable: boolean
    /**
     * Source type, one of:
     * hls — HTTP Live Streaming (M3U8).
     * mp4 — MP4 file.
     * mkv — MKV file.
     * dash — MPEG-DASH (.mpd files).
     */
    type: SourceTypes
    /**
     * Video quality. One of 8K, 4K, QHD, FHD, HD, SD, or Auto: Quality should be inferred from the best available metadata, prioritizing resolution, then bitrate, filename, or manifest information. If the quality cannot be determined, use Auto.
     *
     * The ranges are like following:
     * 4320p+ → 8K
     * 2160p–4319p → 4K
     * 1440p–2159p → QHD
     * 1080p–1439p → FHD
     * 720p–1079p → HD
     * Below 720p → SD
     * Unknown → Auto
     */
    quality: SourceQuality
    /**
     * Information on the provider that provided this source.
     */
    provider: { id: string; name: string }
}

/**
 * A source that has at least one known language baked into the stream itself
 * (e.g. audio muxed into the HLS/DASH manifest or MP4/MKV file).
 */
interface SourceWithLanguages extends BaseSource {
    /**
     * Human-readable language name(s). default/unknown --> Original
     * This should be provided to the best of the provider's ability.
     * You should only list languages that are actually available in this specific source. If the source only contains video (no audio), keep this array empty and add the audiotracks via result.audioTrack().
     */
    languages: NonEmptyArray<string>
    audioTracks?: never
}

/**
 * A source with no muxed-in audio at all (e.g. video-only stream).
 * MUST provide at least one separate AudioTrack instead.
 */
interface SourceWithAudioTracks extends BaseSource {
    languages?: never
    /**
     * Array of audio tracks.
     */
    audioTracks: NonEmptyArray<AudioTrack>
}

/**
 * A source object.
 * A source MUST declare at least one language (muxed-in) OR at least one
 * separate audioTrack. Both may be present; at least one is required.
 * @see https://github.com/omss-spec/omss-spec/blob/main/spec/v1.1/omss-v1.1.md#62-source-object
 */
export type Source = SourceWithLanguages | SourceWithAudioTracks

/**
 * Valid Source Types
 */
export type SourceTypes = 'hls' | 'mp4' | 'dash' | 'mkv'

/**
 * Video quality
 */
export type SourceQuality = '8K' | '4K' | 'QHD' | 'FHD' | 'HD' | 'SD' | 'Auto'

/**
 * A subtitle object.
 * @see https://github.com/omss-spec/omss-spec/blob/main/spec/v1.1/omss-v1.1.md#63-subtitle-object
 */
export interface Subtitle {
    /**
     * A string representing the original URL to the subtitle from the provider, which may require CORS handling or custom headers (provided in the headers field).
     */
    url: string
    /**
     * Key-value pairs of HTTP (and non-standard HTTP) headers that should be included when accessing the subtitle URL.
     */
    header: HeadersInit
    /**
     * Human-readable language name for the subtitle track. default/unknown --> Unknown
     */
    label: string
    /**
     * Subtitle format, one of:
     *
     * vtt — WebVTT.
     * srt — SubRip.
     */
    format: SubtitleFormat
    /**
     * Information on the provider that provided this subtitle track.
     */
    provider: { id: string; name: string }
}

/**
 * Valid Subtitle Formats
 */
export type SubtitleFormat = 'vtt' | 'srt'

/**
 * An audio track object.
 * @see https://github.com/omss-spec/omss-spec/blob/main/spec/v1.1/omss-v1.1.md#62-source-object:~:text=Unknown%20%E2%86%92%20Auto-,audioTracks,-(array%20of%20strings
 * @see https://github.com/omss-spec/omss-spec/issues/8
 */
export interface AudioTrack {
    /**
     * A string representing the original URL to the audiotrack from the provider, which may require CORS handling or custom headers (provided in the headers field).
     */
    url: string
    /**
     * Key-value pairs of HTTP (and non-standard HTTP) headers that should be included when accessing the audiotrack URL.
     */
    header: HeadersInit
    /**
     * Human-readable language name for the audiotrack. default/unknown --> Unknown
     */
    label: string
}

/**
 * A middleware function for the provider `register` pipeline.
 *
 * Receives the provider being registered and a `next` function to call
 * the next middleware (or the final `add` step). Return an `ERR` to
 * short-circuit registration with a custom error.
 */
export type RegisterMiddleware = (provider: UnknownProvider, next: () => Promise<Result<UnknownProvider, OMSSProviderError>>) => Promise<Result<UnknownProvider, OMSSProviderError>>
