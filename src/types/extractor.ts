import { Result } from '@/types/utils.js'
import { OMSSExtractorError } from '@/utils/error.js'

/**
 * Extractor interface.
 *
 * Extractors are used to extract media URLs from a given hosting platform.
 */
export type Extractor = {
    /**
     * A matcher function that checks if the extractor can handle the given URL.
     */
    matcher: ExtractorMatcher

    /**
     * Parse the given URL and return the extracted media URL and headers required for playback.
     * @param url - The URL to parse.
     * @param ctx - Context object containing the referrer (what website opened the URL. If not applicable, keep string empty) and headers.
     */
    parse: (url: string, ctx: ExtractorContext) => Promise<Result<ExtractorResult, OMSSExtractorError>>
}

type ExtractorMatcher = (url: string) => Promise<Result<void, OMSSExtractorError>>

type ExtractorResult = {
    /**
     * The media URL.
     */
    url: string
    /**
     * Headers required for playback of the provided url.
     */
    header: Record<string, string>
}

type ExtractorContext = {
    /**
     * The referrer (what website opened the URL. If not applicable, keep string empty)
     */
    referrer: string
    /**
     * Headers required for playback of the provided url. If not applicable, keep empty.
     */
    header: Record<string, string>
    /**
     * AbortSignal for cancellation.
     */
    signal: AbortSignal
}
