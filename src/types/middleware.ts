/**
 * A typed map of middleware-enabled operations.
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
 */
export type MiddlewareHandler<TOperations extends MiddlewareOperationMap, TMethod extends keyof TOperations> = (
    context: TOperations[TMethod]['context'],
    next: () => Promise<TOperations[TMethod]['result']>
) => Promise<TOperations[TMethod]['result']>
