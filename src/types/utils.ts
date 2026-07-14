/**
 * A discriminated union representing either a successful result or a failure.
 * Can be {ok: true}, {ok: true, value: T} or {ok: false, error: E}
 * @typeParam T - The success value type.
 * @typeParam E - The error value type.
 */
export type Result<T, E extends Error> = (T extends void ? { ok: true } : { ok: true; value: T }) | { ok: false; error: E }
