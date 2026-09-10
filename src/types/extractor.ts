import { type Result } from '@/types/utils.js'
import { type OMSSExtractorError } from '@/utils/error.js'

/**
 * Extracts media URLs from a given hosting platform.
 *
 * Extractors are registered on {@link OMSSServer.extractors} and looked up
 * by URL via `find()` - typically from within a provider's `getSources()`
 * (see `request.utils.findExtractor`).
 */
export type Extractor = {
    /**
     * Checks whether this extractor can handle the given URL.
     */
    matcher: ExtractorMatcher

    /**
     * Parses the given URL and returns the extracted media URL and headers required for playback.
     *
     * @param url - The URL to parse.
     * @param ctx - Context for the parse (referrer, headers, cancellation).
     */
    parse: (url: string, ctx: ExtractorContext) => Promise<Result<ExtractorResult, OMSSExtractorError>>
}

/**
 * Checks whether an {@link Extractor} can handle the given URL.
 *
 * @param url - The URL to check.
 * @returns `OK` if the extractor can handle the URL, `ERR` otherwise.
 */
type ExtractorMatcher = (url: string) => Promise<Result<void, OMSSExtractorError>>

/**
 * The result of a successful {@link Extractor.parse} call.
 */
type ExtractorResult = {
    /**
     * The extracted, directly playable media URL.
     */
    url: string
    /**
     * Headers required for playback of the provided URL.
     */
    header: Record<string, string>
}

/**
 * Context passed to {@link Extractor.parse}.
 */
type ExtractorContext = {
    /**
     * The site that linked to this URL. Empty string if not applicable.
     */
    referrer: string
    /**
     * Headers required to access the URL being parsed. Empty object if not applicable.
     */
    header: Record<string, string>
    /**
     * Abort signal for cancellation.
     */
    signal: AbortSignal
}
