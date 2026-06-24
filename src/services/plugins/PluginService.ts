import { PluginRegistry } from '@/services/plugins/PluginRegistry.js'
import { HookRegistry } from '@/services/hooks/HookRegistry.js'
import type { OMSSConfiguredPluginType, OMSSPluginOptions, OMSSPluginType, UnknownPluginType } from '@/types/plugin.js'
import OMSSServer from '@/core/server.js'

/**
 * The public API for managing OMSS plugins.
 */
export class PluginService {
    readonly #pluginRegistry: PluginRegistry
    readonly #hookRegistry: HookRegistry
    readonly #omssServer: OMSSServer
    #insideOnRegister = false

    constructor(omssServer: OMSSServer, pluginRegistry: PluginRegistry, hookRegistry: HookRegistry) {
        this.#omssServer = omssServer
        this.#pluginRegistry = pluginRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Register an OMSS plugin with no config into the system.
     * @param plugin - Plugin function
     */
    async register(plugin: OMSSPluginType): Promise<void>

    /**
     * Register an OMSS plugin with a config into the system.
     * @param plugin - Plugin function
     * @param options - Plugin configuration
     */
    async register<T>(plugin: OMSSConfiguredPluginType<T>, options: OMSSPluginOptions<T>): Promise<void>

    /**
     * Registers an OMSS plugin that can take a config into the system, but does not need to.
     * @param plugin - Plugin implementation
     * @param options - Plugin configuration
     */
    async register(plugin: UnknownPluginType, options?: unknown): Promise<void> {
        if (this.#insideOnRegister) {
            throw new Error('Plugins cannot be registered during onRegister')
        }

        this.#insideOnRegister = true
        await this.#hookRegistry.run('onRegister', {
            plugin: plugin as UnknownPluginType,
            options,
        })
        this.#insideOnRegister = false

        await this.#pluginRegistry.add(this.#omssServer, plugin, options)
    }

    /**
     * Get the current State of a plugin
     * @param plugin - the plugin to get the state from
     * @returns - an Enum of PluginState
     */
    getPluginState(plugin: UnknownPluginType) {
        return this.#pluginRegistry.getState(plugin)
    }
}
