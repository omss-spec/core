import { type MiddlewareHandler, type MiddlewareOperationMap } from '@/types/middleware.js'

/**
 * Reusable typed middleware runner.
 */
export interface MiddlewareRunner<TOperations extends MiddlewareOperationMap> {
    /**
     * Register middleware for a specific operation.
     *
     * @param method - Operation name.
     * @param handler - Middleware handler.
     */
    use<TMethod extends keyof TOperations>(method: TMethod, handler: MiddlewareHandler<TOperations, TMethod>): void

    /**
     * Run middleware chain for a specific operation.
     *
     * @param method - Operation name.
     * @param context - Operation context payload.
     * @param finalHandler - Final function to execute after middleware.
     * @returns The operation result.
     */
    run<TMethod extends keyof TOperations>(
        method: TMethod,
        context: TOperations[TMethod]['context'],
        finalHandler: () => Promise<TOperations[TMethod]['result']>
    ): Promise<TOperations[TMethod]['result']>
}

/**
 * Creates a reusable typed middleware runner.
 */
export function createMiddlewareRunner<TOperations extends MiddlewareOperationMap>(): MiddlewareRunner<TOperations> {
    const handlers: Partial<{
        [K in keyof TOperations]: MiddlewareHandler<TOperations, K>[]
    }> = {}

    return {
        use(method, handler) {
            const list = (handlers[method] ??= []) as MiddlewareHandler<TOperations, typeof method>[]

            list.push(handler)
        },

        run(method, context, finalHandler) {
            const chain = (handlers[method] ?? []) as readonly MiddlewareHandler<TOperations, typeof method>[]

            let index = -1

            const dispatch = (position: number): Promise<TOperations[typeof method]['result']> => {
                if (position <= index) {
                    return Promise.reject(new Error('next() called multiple times'))
                }

                index = position

                const handler = chain[position]

                if (!handler) {
                    return finalHandler()
                }

                return handler(context, () => dispatch(position + 1))
            }

            return dispatch(0)
        },
    }
}
