import type { OMSSPluginOptions, OMSSPluginType } from './plugin.js'

/**
 * Strongly typed hook map for OMSS lifecycle events.
 * Each hook name defines its own strictly-typed payload.
 */
export type OMSSHooks = {
    onRegister: <T>(payload: { plugin: OMSSPluginType<T>; options: OMSSPluginOptions<T> }) => void | Promise<void>

    onError: (payload: { error: Error }) => void | Promise<void>
}

/**
 * Union of all valid hook names.
 */
export type HookName = keyof OMSSHooks

/**
 * Type of the payload of a certain function
 */
export type HookPayload<Fn> = Fn extends (payload: infer P) => void | Promise<void> ? P : never
