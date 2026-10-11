/**
 * Exports the OMSSError hierarchy, the Result-object helpers (`OK`/`ERR`/`validateSafeUniqueString`),
 * and shared validation regexes so plugins can use them without rewriting the code.
 */
export * from '@/utils/error.js'
export * from '@/utils/utils.js'
export { CATALOG_ENTRY, DASH_REGEX, HLS_REGEX, MKV_REGEX, MP4_REGEX, SAFE_UNIQUE_STRING, SRT_REGEX, VTT_REGEX } from '@/utils/regexp.js'
