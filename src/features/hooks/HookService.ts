import { createHookRegistry, type HookRegistry } from '@/features/hooks/HookRegistry.js'

/**
 * The public API for managing OMSS hooks.
 */
export interface HookService<T> {
    /**
     * All registered hooks, keyed by hook name. Read-only - use `add()` to register a hook.
     *
     * @dangerous Mutating the returned map's values directly bypasses `add()` and can cause surprising side effects.
     */
    readonly hooks: ReadonlyMap<keyof T, unknown[]>

    /**
     * Registers a hook handler for a lifecycle event.
     *
     * @typeParam K - The hook name being registered.
     * @param name - The hook name (a key of `T`).
     * @param cb - The handler function for this hook.
     */
    add<K extends keyof T>(name: K, cb: T[K]): ReturnType<HookRegistry<T>['add']>

    /**
     * Clears all registered hooks.
     *
     * @dangerous Removes every hook handler, including ones registered by other plugins.
     */
    reset(): ReturnType<HookRegistry<T>['reset']>

    /**
     * Returns the underlying {@link HookRegistry}.
     *
     * @dangerous For internal use by other core services only - consumer code should not need to reach past `add`/`reset`/`hooks`.
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
