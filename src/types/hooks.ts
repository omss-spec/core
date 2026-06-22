import type { OMSSPluginOptions, OMSSPluginType } from './plugin.js'

/**
 * Hook map for OMSS lifecycle events.
 * Each hook name with its own payload.
 */
export type OMSSHooks = {
    onRegister: <T>(payload: { plugin: OMSSPluginType<T>; options: OMSSPluginOptions<T> }) => void | Promise<void>

    onError: (payload: { error: Error }) => void | Promise<void>
}