import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { OMSSHooks } from '@/types/hooks.js'

export class HookService {
    readonly #hookRegistry: HookRegistry

    constructor(hookRegistry: HookRegistry) {
        this.#hookRegistry = hookRegistry
    }

    /**
     * Get all registered hooks immutable. TO ADD HOOKS, USE THE ADD METHOD
     * @dangerous - Be careful with this. what you are doing might cause side effects.
     */
    get hooks(): ReadonlyMap<keyof OMSSHooks, unknown[]> {
        return this.#hookRegistry.hooks
    }

    /**
     * Register a hook for a lifecycle event.
     *
     * @typeParam K - The name of the hook to register.
     * @param name - The hook name (key of THooks).
     * @param cb - The handler function for this hook.
     */
    add<K extends keyof OMSSHooks>(name: K, cb: OMSSHooks[K]): ReturnType<HookRegistry['add']> {
        this.#hookRegistry.add(name, cb)
    }

    /**
     * Clear all registered hooks.
     * @dangerous - Be careful with this. Might cause side effects.
     */
    reset(): ReturnType<HookRegistry['reset']> {
        return this.#hookRegistry.reset()
    }
}
