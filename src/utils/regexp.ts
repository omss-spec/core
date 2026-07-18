/**
 * Regex for validating namespace names.
 */
export const SAFE_UNIQUE_STRING = /^[a-z0-9-]+$/

/**
 * Regex for matching media formats by keyword or file extension.
 *
 * Matches:
 * - format keywords (`hls`, `dash`, `mp4`, etc.)
 * - common media file extensions
 * - extensions followed by URL query strings, fragments, paths, or the end of the URL
 */
export const HLS_REGEX = /\bhls\b|\.(?:m3u8|ts)(?:$|[\/?#])/i
export const MP4_REGEX = /\bmp4\b|\.mp4(?:$|[\/?#])/i
export const DASH_REGEX = /\bdash\b|\.(?:mpd|m4a)(?:$|[\/?#])/i
export const MKV_REGEX = /\bmkv\b|\.mkv(?:$|[\/?#])/i
export const VTT_REGEX = /\bvtt\b|\.vtt(?:$|[\/?#])/i
export const SRT_REGEX = /\bsrt\b|\.srt(?:$|[\/?#])/i
