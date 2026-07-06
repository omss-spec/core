import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import type { OMSSConfiguredPluginType, OMSSPluginOptions, OMSSPluginType, UnknownPluginType } from '@/types/plugin.js'
import OMSSServer from '@/core/server.js'
import { ERR } from '@/utils/utils.js'
import { OMSSPluginError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { PluginState } from '@/features/plugins/plugin-state.js'

/**
 * The public API for managing OMSS plugins.
 */
export class PluginService {
    readonly #pluginRegistry: PluginRegistry
    readonly #hookRegistry: HookRegistry
    readonly #omssServer: OMSSServer
    #insideOnPluginRegister = false

    constructor(omssServer: OMSSServer, pluginRegistry: PluginRegistry, hookRegistry: HookRegistry) {
        this.#omssServer = omssServer
        this.#pluginRegistry = pluginRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Register an OMSS plugin with no config into the system.
     * @param plugin - Plugin function
     */
    async register(plugin: OMSSPluginType): Promise<Result<PluginState, OMSSPluginError>>

    /**
     * Register an OMSS plugin with a config into the system.
     * @param plugin - Plugin function
     * @param options - Plugin configuration
     */
    async register<T>(plugin: OMSSConfiguredPluginType<T>, options: OMSSPluginOptions<T>): Promise<Result<PluginState, OMSSPluginError>>

    /**
     * Registers an OMSS plugin that can take a config into the system, but does not need to.
     * @param plugin - Plugin implementation
     * @param options - Plugin configuration
     */
    async register(plugin: UnknownPluginType, options?: unknown): Promise<Result<PluginState, OMSSPluginError>> {
        if (this.#insideOnPluginRegister) {
            return ERR(new OMSSPluginError('Plugins cannot be registered during onPluginRegister'))
        }

        this.#insideOnPluginRegister = true
        try {
            await this.#hookRegistry.run('onPluginRegister', { plugin: plugin as UnknownPluginType, options })
        } finally {
            this.#insideOnPluginRegister = false
        }

        return await this.#pluginRegistry.add(this.#omssServer, plugin, options)
    }

    /**
     * Get the current State of a plugin
     * @param plugin - the plugin to get the state from
     * @returns - a value of the PluginState enum
     */
    getPluginState(plugin: UnknownPluginType) {
        return this.#pluginRegistry.getState(plugin)
    }
}
