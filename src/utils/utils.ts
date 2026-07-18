import { Result } from '@/types/utils.js'
import { OMSSError } from '@/utils/error.js'
import { SAFE_UNIQUE_STRING } from '@/utils/regexp.js'

/**
 * Convenience factory for a successful result.
 */
export function OK(): Result<void, never>
export function OK<T>(value: T): Result<T, never>

export function OK(value?: unknown) {
    if (arguments.length === 0) {
        return { ok: true }
    }

    return { ok: true, value }
}
/**
 * Convenience factory for a failed result.
 */
export const ERR = <E extends Error>(error: E): Result<never, E> => ({ ok: false, error })

type ErrorConstructor<T extends OMSSError> = new (message: string, options?: { cause?: Error }) => T

/**
 * Validate a string is safe for use as a unique identifier (only lowercase letters, numbers, and hyphens).
 * @param value - The string to validate
 * @param name - The name of the identifier, for error messages
 * @param ErrorType - The error type to return if validation fails
 */
export function validateSafeUniqueString<T extends OMSSError>(value: string, name: string, ErrorType: ErrorConstructor<T>): Result<void, T> {
    if (!SAFE_UNIQUE_STRING.test(value)) {
        return ERR(new ErrorType(`Invalid ${name} "${value}". Expected only letters (lowercase), numbers, and hyphens.`))
    }

    return OK(undefined)
}
