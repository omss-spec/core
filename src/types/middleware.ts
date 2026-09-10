/**
 * A typed map of middleware-enabled operations.
 *
 * Each key is an operation name; its value describes the `context` payload
 * passed to middleware and the `result` type middleware must resolve with.
 */
export type MiddlewareOperationMap = Record<
    string,
    {
        context: unknown
        result: unknown
    }
>

/**
 * Middleware function for a specific operation.
 *
 * @typeParam TOperations - The operation map this handler belongs to.
 * @typeParam TMethod - The specific operation this handler runs for.
 * @param context - The operation's context payload.
 * @param next - Calls the next middleware in the chain (or the final handler if this is the last one).
 * @returns The operation's result, as resolved by `next()` or a value the middleware supplies itself.
 */
export type MiddlewareHandler<TOperations extends MiddlewareOperationMap, TMethod extends keyof TOperations> = (
    context: TOperations[TMethod]['context'],
    next: () => Promise<TOperations[TMethod]['result']>
) => Promise<TOperations[TMethod]['result']>
