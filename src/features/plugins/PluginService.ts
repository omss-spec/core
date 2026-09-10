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
     * Register an OMSS plugin with no config into the system.
     * @param plugin - Plugin function
     */
    register(plugin: OMSSPluginType): ReturnType<PluginRegistry['add']>

    /**
     * Register an OMSS plugin with a config into the system.
     * @param plugin - Plugin function
     * @param options - Plugin configuration
     */
    register<T>(plugin: OMSSConfiguredPluginType<T>, options: OMSSPluginOptions<T>): ReturnType<PluginRegistry['add']>

    /**
     * Get the current State of a plugin
     * @param plugin - the plugin to get the state from
     * @returns - a value of the PluginState enum
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
         * Registers an OMSS plugin that can take a config into the system, but does not need to.
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
