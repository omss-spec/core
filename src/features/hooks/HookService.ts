import { createHookRegistry, type HookRegistry } from '@/features/hooks/HookRegistry.js'

/**
 * The public API for managing OMSS hooks.
 */
export interface HookService<T> {
    /**
     * Get all registered hooks immutable. TO ADD HOOKS, USE THE ADD METHOD
     * @dangerous - Be careful with this. what you are doing might cause side effects.
     */
    readonly hooks: ReadonlyMap<keyof T, unknown[]>

    /**
     * Register a hook for a lifecycle event.
     *
     * @typeParam K - The name of the hook to register.
     * @param name - The hook name (key of THooks).
     * @param cb - The handler function for this hook.
     */
    add<K extends keyof T>(name: K, cb: T[K]): ReturnType<HookRegistry<T>['add']>

    /**
     * Clear all registered hooks.
     * @dangerous - Be careful with this. Might cause side effects.
     */
    reset(): ReturnType<HookRegistry<T>['reset']>

    /**
     * Get the hook registry.
     *
     * This is only exposed for internal purposes and should not be accessed in consumer projects.
     * @dangerous
     * @internal
     */
    __getRegistry(): HookRegistry<T>
}

/**
 * Creates a new {@link HookService}.
 *
 * @param hookRegistry - The hook registry to wrap. Defaults to a fresh {@link HookRegistry}.
 */
export function createHookService<T>(hookRegistry: HookRegistry<T> = createHookRegistry<T>()): HookService<T> {
    return {
        get hooks() {
            return hookRegistry.hooks
        },

        add(name, cb) {
            hookRegistry.add(name, cb)
        },

        reset() {
            return hookRegistry.reset()
        },

        __getRegistry() {
            return hookRegistry
        },
    }
}
