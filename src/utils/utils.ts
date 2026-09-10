import { type Result } from '@/types/utils.js'
import { type OMSSError } from '@/utils/error.js'
import { SAFE_UNIQUE_STRING } from '@/utils/regexp.js'

/**
 * Convenience factory for a successful, valueless {@link Result}.
 */
export function OK(): Result<void, never>

/**
 * Convenience factory for a successful {@link Result} carrying a value.
 *
 * @typeParam T - The success value type.
 * @param value - The success value.
 */
export function OK<T>(value: T): Result<T, never>

export function OK(value?: unknown) {
    if (arguments.length === 0) {
        return { ok: true }
    }

    return { ok: true, value }
}

/**
 * Convenience factory for a failed {@link Result}.
 *
 * @typeParam E - The error type.
 * @param error - The error to wrap.
 * @example
 * ```ts
 * return ERR(new OMSSProviderError('provider not found'))
 * ```
 */
export const ERR = <E extends Error>(error: E): Result<never, E> => ({ ok: false, error })

/**
 * The constructor shape every {@link OMSSError} subclass follows.
 *
 * @typeParam T - The specific {@link OMSSError} subclass being constructed.
 */
type ErrorConstructor<T extends OMSSError> = new (message: string, options?: { cause?: Error }) => T

/**
 * Validates that a string is safe for use as a unique identifier (lowercase letters, numbers, and hyphens only).
 *
 * @typeParam T - The {@link OMSSError} subclass to return on validation failure.
 * @param value - The string to validate.
 * @param name - A human-readable name for the identifier, used in the error message.
 * @param ErrorType - The error constructor to use if validation fails.
 * @returns `OK` if `value` is valid, otherwise `ERR` wrapping a new `ErrorType`.
 */
export function validateSafeUniqueString<T extends OMSSError>(value: string, name: string, ErrorType: ErrorConstructor<T>): Result<void, T> {
    if (!SAFE_UNIQUE_STRING.test(value)) {
        return ERR(new ErrorType(`Invalid ${name} "${value}". Expected only letters (lowercase), numbers, and hyphens.`))
    }

    return OK()
}
