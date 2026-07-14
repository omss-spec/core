import type { OMSSPluginOptions, UnknownPluginType } from '@/types/plugin.js'
import { UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'

/**
 * Hook map for OMSS lifecycle events.
 * Each hook name maps to its own payload signature.
 */
export type OMSSHooks = {
    /**
     * Called before a plugin is registered.
     */
    beforePluginRegister: <T>(payload: { plugin: UnknownPluginType; options?: OMSSPluginOptions<T> }) => void | Promise<void>

    /**
     * Called after a plugin is successfully registered.
     */
    afterPluginRegister: <T>(payload: { plugin: UnknownPluginType; options?: OMSSPluginOptions<T> }) => void | Promise<void>

    /**
     * Called when a plugin registration fails.
     */
    pluginRegisterFailed: <T>(payload: { plugin: UnknownPluginType; options?: OMSSPluginOptions<T>; error: Error }) => void | Promise<void>

    /**
     * Called before a provider is registered.
     */
    beforeProviderRegister: (payload: { provider: UnknownProvider }) => void | Promise<void>

    /**
     * Called after a provider is successfully registered.
     */
    afterProviderRegister: (payload: { provider: UnknownProvider }) => void | Promise<void>

    /**
     * Called when a provider registration fails.
     */
    providerRegisterFailed: (payload: { provider: UnknownProvider; error: OMSSProviderError }) => void | Promise<void>
}
