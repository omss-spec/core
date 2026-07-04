import type { OMSSHooks } from '@/types/hooks.js'

/**
 * Hook Registry
 *
 * Manages lifecycle hooks for OMSS events.
 * @typeParam THooks - A record of hook names to their handler functions.
 */
export class HookRegistry {
    /**
     * Map storing arrays of hook handlers for each hook name.
     * @internal
     */
    readonly hooks = new Map<keyof OMSSHooks, unknown[]>()

    /**
     * Run all hooks for a lifecycle event with the provided payload.
     *
     * @typeParam K - The name of the hook to run.
     * @param name - The hook name (key of THooks).
     * @param payload - The payload to pass to each hook handler.
     * @internal
     */
    async run<K extends keyof OMSSHooks>(name: K, payload: OMSSHooks[K] extends (payload: infer P) => unknown ? P : never): Promise<void> {
        const fns = this.hooks.get(name) ?? []

        for (const fn of fns) {
            await (fn as (payload: unknown) => void | Promise<void>)(payload)
        }
    }
}
