import type { OMSSPluginOptions, UnknownPluginType } from '@/types/plugin.js'

/**
 * Hook map for OMSS lifecycle events.
 * Each hook name with its own payload.
 */
export type OMSSHooks = {
    onPluginRegister: <T>(payload: { plugin: UnknownPluginType; options: OMSSPluginOptions<T> }) => void | Promise<void>

    // TODO: Needs some global error handling
    onError: (payload: { error: Error }) => void | Promise<void>
}
