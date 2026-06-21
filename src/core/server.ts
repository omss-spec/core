import { HookRegistry } from '../services/hooks/index.js'
import { PluginRegistry } from '../services/plugins/index.js'
import type { OMSSConfig, OMSSHooks, OMSSPluginType, OMSSPluginOptions } from '../types/index.js'

/**
 * Core server class for OMSS.
 */
export class OMSSServer {
    readonly #config: OMSSConfig
    readonly hooks: HookRegistry<OMSSHooks>
    readonly plugins: PluginRegistry

    /**
     * Creates a new OMSSServer instance.
     *
     * @param config - Immutable server configuration
     */
    constructor(config: OMSSConfig) {
        this.#config = config

        this.hooks = new HookRegistry<OMSSHooks>()

        this.plugins = new PluginRegistry()
    }

    /**
     * Registers an OMSS plugin into the system.
     *
     * @typeParam T - Plugin option type
     * @param plugin - Plugin implementation
     * @param options - Plugin configuration
     */
    async register<T>(plugin: OMSSPluginType<T>, options: OMSSPluginOptions<T>): Promise<void> {
        this.hooks.run('onRegister', {
            plugin: plugin as OMSSPluginType<unknown>,
            options: options as OMSSPluginOptions<T>,
        })

        await this.plugins.add(this, plugin, options)
    }

    /**
     * Returns immutable server configuration.
     */
    getConfig(): OMSSConfig {
        return this.#config
    }
}
