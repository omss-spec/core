/**
 * A discriminated union representing either a successful result or a failure.
 * @typeParam T - The success value type.
 * @typeParam E - The error value type.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
