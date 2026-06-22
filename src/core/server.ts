import { HookRegistry } from '../services/hooks/index.js'
import { PluginRegistry } from '../services/plugins/index.js'
import type { OMSSConfig, OMSSHooks, OMSSPluginType, OMSSPluginOptions } from '../types/index.js'

/**
 * Core server class for OMSS.
 */
export class OMSSServer {
    readonly #config: OMSSConfig
    readonly #hooks: HookRegistry<OMSSHooks>
    readonly #plugins: PluginRegistry

    /**
     * Creates a new OMSSServer instance.
     *
     * @param config - Immutable server configuration
     */
    constructor(config: OMSSConfig) {
        this.#config = config
        this.#hooks = new HookRegistry<OMSSHooks>()
        this.#plugins = new PluginRegistry()
    }

    /**
     * Registers an OMSS plugin into the system.
     *
     * @typeParam T - Plugin option type
     * @param plugin - Plugin implementation
     * @param options - Plugin configuration
     */
    async register<T>(plugin: OMSSPluginType<T>, options?: OMSSPluginOptions<T>): Promise<void> {
        this.#hooks.run('onRegister', {
            plugin: plugin as OMSSPluginType<unknown>,
            options: options as OMSSPluginOptions<T>,
        })

        await this.#plugins.add(this, plugin, options)
    }

    getPluginState<T>(plugin: OMSSPluginType<T>) {
        return this.#plugins.getState(plugin);
    }

    /**
     * Add hook to the OMSS Server lifecycle
     *
     * @param name - name of the hook you want to listen to
     * @param cb - callback function that gets run
     */
    addHook<K extends keyof OMSSHooks>(name: K, cb: OMSSHooks[K]) {
        this.#hooks.add(name, cb)
    }

    /**
     * Get the OMSS Config from the constructor
     * @returns the initialised OMSS Config
     */
    getConfig(): OMSSConfig {
        return this.#config
    }
}
