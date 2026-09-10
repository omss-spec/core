/**
 * Hook Registry
 *
 * Manages lifecycle hooks for OMSS events.
 */
export interface HookRegistry<T> {
    /**
     * All registered hooks, keyed by hook name. Read-only - use `add()` to register a hook.
     *
     * @dangerous Mutating the returned map's values directly bypasses `add()` and can cause surprising side effects.
     */
    readonly hooks: ReadonlyMap<keyof T, unknown[]>

    /**
     * Clears all registered hooks.
     *
     * @dangerous Removes every hook handler, including ones registered by other plugins.
     */
    reset(): void

    /**
     * Run all hooks for a lifecycle event with the provided payload.
     *
     * @typeParam K - The name of the hook to run.
     * @param name - The hook name (key of THooks).
     * @param payload - The payload to pass to each hook handler.
     */
    run<K extends keyof T>(name: K, payload: T[K] extends (payload: infer P) => unknown ? P : never): Promise<void>

    /**
     * Add a hook handler for a lifecycle event.
     * @param name - The hook name (key of THooks).
     * @param cb - The hook handler function.
     */
    add<K extends keyof T>(name: K, cb: T[K]): void
}

/**
 * Creates a new {@link HookRegistry}.
 */
export function createHookRegistry<T>(): HookRegistry<T> {
    const hooks = new Map<keyof T, unknown[]>()

    return {
        get hooks() {
            return hooks
        },

        reset() {
            hooks.clear()
        },

        async run(name, payload) {
            const fns = hooks.get(name) ?? []

            for (const fn of fns) {
                await (fn as (payload: unknown) => void | Promise<void>)(payload)
            }
        },

        add(name, cb) {
            const existing = hooks.get(name) ?? []

            hooks.set(name, [...existing, cb])
        },
    }
}
