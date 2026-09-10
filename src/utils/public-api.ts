/**
 * Exports the OMSSError hierarchy, the Result-object helpers (`OK`/`ERR`/`validateSafeUniqueString`),
 * and shared validation regexes so plugins can use them without rewriting the code.
 */
export * from '@/utils/error.js'
export * from '@/utils/utils.js'
export { SAFE_UNIQUE_STRING } from '@/utils/regexp.js'
