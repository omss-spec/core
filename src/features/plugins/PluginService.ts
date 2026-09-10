import { type PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { type HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { OMSSConfiguredPluginType, OMSSPluginOptions, OMSSPluginType, UnknownPluginType } from '@/types/plugin.js'
import { ERR } from '@/utils/utils.js'
import { OMSSPluginError } from '@/utils/error.js'
import type { OMSSHooks } from '@/types/hooks.js'

/**
 * The public API for managing OMSS plugins.
 */
export interface PluginService {
    /**
     * Registers a configless OMSS plugin.
     *
     * @param plugin - The plugin function to register.
     * @returns The registered state, or an error if registration failed.
     */
    register(plugin: OMSSPluginType): ReturnType<PluginRegistry['add']>

    /**
     * Registers an OMSS plugin with configuration.
     *
     * @typeParam T - The plugin's configuration type.
     * @param plugin - The plugin function to register.
     * @param options - The plugin's configuration, or a factory that resolves it.
     * @returns The registered state, or an error if registration failed.
     */
    register<T>(plugin: OMSSConfiguredPluginType<T>, options: OMSSPluginOptions<T>): ReturnType<PluginRegistry['add']>

    /**
     * Gets the current state of a plugin.
     *
     * @param plugin - The plugin to look up.
     * @returns The plugin's current {@link PluginState}.
     */
    getPluginState(plugin: UnknownPluginType): ReturnType<PluginRegistry['getState']>
}

/**
 * Creates a new {@link PluginService}.
 *
 * @param pluginRegistry - The plugin registry to wrap.
 * @param hookRegistry - The hook registry used to dispatch plugin lifecycle hooks.
 */
export function createPluginService(pluginRegistry: PluginRegistry, hookRegistry: HookRegistry<OMSSHooks>): PluginService {
    let insideBeforePluginRegister = false

    return {
        /**
         * Registers an OMSS plugin, with or without configuration.
         *
         * Runs the `beforePluginRegister` → registry `add()` → `afterPluginRegister`/`pluginRegisterFailed` hook pipeline.
         */
        async register(plugin: UnknownPluginType, options?: unknown): ReturnType<PluginRegistry['add']> {
            if (insideBeforePluginRegister) {
                return ERR(new OMSSPluginError('Plugins cannot be registered during beforePluginRegister'))
            }

            insideBeforePluginRegister = true
            try {
                await hookRegistry.run('beforePluginRegister', { plugin: plugin, options })
            } finally {
                insideBeforePluginRegister = false
            }

            const result = await pluginRegistry.add(plugin, options)

            if (!result.ok) {
                await hookRegistry.run('pluginRegisterFailed', { plugin, options, error: result.error })
                return result
            }

            await hookRegistry.run('afterPluginRegister', { plugin, options })
            return result
        },

        getPluginState(plugin) {
            return pluginRegistry.getState(plugin)
        },
    }
}
