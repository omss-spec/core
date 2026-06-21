/**
 * Hook Registry
 *
 * Manages lifecycle hooks for strongly-typed events.
 * @typeParam THooks - A record of hook names to their handler functions.
 */
export class HookRegistry<THooks extends Record<string, unknown>> {
    /**
     * Map storing arrays of hook handlers for each hook name.
     */
    private hooks = new Map<keyof THooks, unknown[]>()

    /**
     * Register a hook for a lifecycle event.
     *
     * @typeParam K - The name of the hook to register.
     * @param name - The hook name (key of THooks).
     * @param fn - The handler function for this hook.
     */
    add<K extends keyof THooks>(name: K, fn: THooks[K]): void {
        const existing = this.hooks.get(name) ?? []

        // safe because Map preserves exact key association
        this.hooks.set(name, [...existing, fn])
    }

    /**
     * Run all hooks for a lifecycle event with the provided payload.
     *
     * @typeParam K - The name of the hook to run.
     * @param name - The hook name (key of THooks).
     * @param payload - The payload to pass to each hook handler.
     */
    async run<K extends keyof THooks>(name: K, payload: THooks[K] extends (payload: infer P) => any ? P : never): Promise<void> {
        const fns = this.hooks.get(name) ?? []

        for (const fn of fns) {
            // Type-safe because we register handlers with the exact signature
            await (fn as (payload: unknown) => void | Promise<void>)(payload)
        }
    }
}
