import { Result } from '@/types/utils.js'

/**
 * Convenience factory for a successful result.
 */
export const OK = <T>(value: T): Result<T, never> => ({ ok: true, value })
/**
 * Convenience factory for a failed result.
 */
export const ERR = <E>(error: E): Result<never, E> => ({ ok: false, error })
