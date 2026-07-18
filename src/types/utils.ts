/**
 * A discriminated union representing either a successful result or a failure.
 * Can be {ok: true}, {ok: true, value: T} or {ok: false, error: E}
 * @typeParam T - The success value type.
 * @typeParam E - The error value type.
 */
export type Result<T, E extends Error> = (T extends void ? { ok: true } : { ok: true; value: T }) | { ok: false; error: E }

/**
 * A tuple type that represents a non-empty array of elements of type T.
 * The first element is of type T, and the rest of the elements are of type T[].
 * This ensures that the array has at least one element.
 * @typeParam T - The type of the elements in the array.
 */
export type NonEmptyArray<T> = [T, ...T[]]
