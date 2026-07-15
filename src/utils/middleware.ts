import { MiddlewareHandler, MiddlewareOperationMap } from '@/types/middleware.js'

/**
 * Reusable typed middleware runner.
 */
export class MiddlewareRunner<TOperations extends MiddlewareOperationMap> {
    readonly #handlers: Partial<{
        [K in keyof TOperations]: MiddlewareHandler<TOperations, K>[]
    }> = {}

    /**
     * Register middleware for a specific operation.
     *
     * @param method - Operation name.
     * @param handler - Middleware handler.
     */
    use<TMethod extends keyof TOperations>(method: TMethod, handler: MiddlewareHandler<TOperations, TMethod>): void {
        const list = (this.#handlers[method] ??= []) as MiddlewareHandler<TOperations, TMethod>[]

        list.push(handler)
    }

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
    ): Promise<TOperations[TMethod]['result']> {
        const handlers = (this.#handlers[method] ?? []) as readonly MiddlewareHandler<TOperations, TMethod>[]

        let index = -1

        const dispatch = (position: number): Promise<TOperations[TMethod]['result']> => {
            if (position <= index) {
                return Promise.reject(new Error('next() called multiple times'))
            }

            index = position

            const handler = handlers[position]

            if (!handler) {
                return finalHandler()
            }

            return handler(context, () => dispatch(position + 1))
        }

        return dispatch(0)
    }
}
