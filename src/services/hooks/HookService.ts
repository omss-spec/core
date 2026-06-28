import { HookRegistry } from '@/services/hooks/HookRegistry.js'
import type { OMSSHooks } from '@/types/hooks.js'

export class HookService {
    readonly #hookRegistry: HookRegistry

    constructor(hookRegistry: HookRegistry) {
        this.#hookRegistry = hookRegistry
    }

    /**
     * Register a hook for a lifecycle event.
     *
     * @typeParam K - The name of the hook to register.
     * @param name - The hook name (key of THooks).
     * @param cb - The handler function for this hook.
     */
    add<K extends keyof OMSSHooks>(name: K, cb: OMSSHooks[K]): void {
        const existing = this.#hookRegistry.hooks.get(name) ?? []

        this.#hookRegistry.hooks.set(name, [...existing, cb])
    }
}
