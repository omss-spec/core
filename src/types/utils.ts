/**
 * A discriminated union representing either a successful result or a failure.
 *
 * Shaped as `{ ok: true }`, `{ ok: true, value: T }`, or `{ ok: false, error: E }`.
 *
 * @typeParam T - The success value type.
 * @typeParam E - The error value type.
 */
export type Result<T, E extends Error> = (T extends void ? { ok: true } : { ok: true; value: T }) | { ok: false; error: E }

/**
 * A tuple type representing a non-empty array of elements of type `T`.
 *
 * The first element is of type `T`, and the rest are `T[]`, guaranteeing at
 * least one element is present.
 *
 * @typeParam T - The type of the elements in the array.
 */
export type NonEmptyArray<T> = [T, ...T[]]
