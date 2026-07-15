import type { OMSSPluginOptions, UnknownPluginType } from '@/types/plugin.js'
import { UnknownProvider } from '@/types/provider.js'
import { OMSSProviderError } from '@/utils/error.js'
import { OMSSId } from '@/types/resolver.js'
import { GatheredSources } from '@/types/source.js'

/**
 * Hook map for OMSS lifecycle events.
 * Each hook name maps to its own payload signature.
 *
 * Hooks follow a standardized signature:
 * - `before[action]` hooks receive the payload before the event is triggered
 * - `after[action]` hooks receive the payload after the event is triggered
 * - `[action]failed` hooks receive the payload if the event fails
 *
 * @note - There are special hooks with elevated access. See the docs for more info.
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

    /**
     * Called before sources are fetched for an OMSS ID.
     * Receives the raw ID and the optional provider filter.
     *
     * @dangerous - This hook is not intended for general use. You can achieve very funny side effects by using it. Use with caution.
     */
    beforeGetSources: (payload: { omssId: OMSSId; providerId?: string | undefined }) => void | Promise<void>

    /**
     * Called after sources have been successfully fetched.
     * Receives the ID, optional provider filter, and the aggregated result.
     */
    afterGetSources: (payload: { omssId: OMSSId; providerId?: string | undefined; result: GatheredSources }) => void | Promise<void>

    /**
     * Called when a getSources call fails entirely (no provider succeeded).
     */
    getSourcesFailed: (payload: { omssId: OMSSId; providerId?: string | undefined; error: OMSSProviderError }) => void | Promise<void>
}
