/**
 * Hook Registry
 *
 * Manages lifecycle hooks for OMSS events.
 */
export class HookRegistry<T> {
    /**
     * Map storing arrays of hook handlers for each hook name.
     */
    readonly #hooks = new Map<keyof T, unknown[]>()

    /**
     * Get all registered hooks immutable.
     * @dangerous - Be careful with this. what you are doing might cause side effects.
     */
    get hooks(): ReadonlyMap<keyof T, unknown[]> {
        return this.#hooks
    }

    /**
     * Clear all registered hooks.
     * @dangerous - Be careful with this. Might cause side effects.
     */
    reset(): void {
        return this.#hooks.clear()
    }

    /**
     * Run all hooks for a lifecycle event with the provided payload.
     *
     * @typeParam K - The name of the hook to run.
     * @param name - The hook name (key of THooks).
     * @param payload - The payload to pass to each hook handler.
     */
    async run<K extends keyof T>(name: K, payload: T[K] extends (payload: infer P) => unknown ? P : never): Promise<void> {
        const fns = this.#hooks.get(name) ?? []

        for (const fn of fns) {
            await (fn as (payload: unknown) => void | Promise<void>)(payload)
        }
    }

    /**
     * Add a hook handler for a lifecycle event.
     * @param name - The hook name (key of THooks).
     * @param cb - The hook handler function.
     */
    add<K extends keyof T>(name: K, cb: T[K]): void {
        const existing = this.#hooks.get(name) ?? []

        this.#hooks.set(name, [...existing, cb])
    }
}
