import { HookRegistry } from '@/features/hooks/HookRegistry.js'

export class HookService<T> {
    readonly #hookRegistry: HookRegistry<T>

    constructor(hookRegistry: HookRegistry<T> = new HookRegistry<T>()) {
        this.#hookRegistry = hookRegistry
    }

    /**
     * Get all registered hooks immutable. TO ADD HOOKS, USE THE ADD METHOD
     * @dangerous - Be careful with this. what you are doing might cause side effects.
     */
    get hooks(): ReadonlyMap<keyof T, unknown[]> {
        return this.#hookRegistry.hooks
    }

    /**
     * Register a hook for a lifecycle event.
     *
     * @typeParam K - The name of the hook to register.
     * @param name - The hook name (key of THooks).
     * @param cb - The handler function for this hook.
     */
    add<K extends keyof T>(name: K, cb: T[K]): ReturnType<HookRegistry<T>['add']> {
        this.#hookRegistry.add(name, cb)
    }

    /**
     * Clear all registered hooks.
     * @dangerous - Be careful with this. Might cause side effects.
     */
    reset(): ReturnType<HookRegistry<T>['reset']> {
        return this.#hookRegistry.reset()
    }

    /**
     * Get the hook registry.
     *
     * This is only exposed for internal purposes and should not be accessed in consumer projects.
     * @dangerous
     * @internal
     */
    __getRegistry(): HookRegistry<T> {
        return this.#hookRegistry
    }
}
