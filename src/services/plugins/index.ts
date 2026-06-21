import type { OMSSPluginType, OMSSPluginOptions, OMSSHooks } from '../../types/index.js'

import type { OMSSServer } from '../../core/server.js'

/**
 * Internal type for storing registered plugins.
 * Uses a function signature that erases type parameters to allow storing plugins with different type parameters.
 */
type StoredPlugin = {
    plugin: OMSSPluginType<unknown>
    options: unknown | ((server: OMSSServer) => unknown)
}

/**
 * Registry responsible for executing and managing OMSS Plugins.
 *
 * Plugins are executed when added.
 */
export class PluginRegistry {
    /**
     * Array of registered plugins with their associated options.
     */
    readonly #plugins: StoredPlugin[] = []

    /**
     * Adds and runs a plugin with its options.
     *
     * @typeParam T - Plugin options type.
     * @param instance - The server instance to pass to the plugin.
     * @param plugin - The plugin function to register.
     * @param options - Plugin options or a factory function that resolves options.
     */
    async add<T>(instance: OMSSServer, plugin: OMSSPluginType<T>, options: OMSSPluginOptions<T>): Promise<void> {
        const resolved = typeof options === 'function' ? (options as (server: OMSSServer) => T)(instance) : options

        await plugin(instance, resolved)
        this.#plugins.push({ plugin: plugin as OMSSPluginType<unknown>,  options })
    }

    /**
     * Returns all registered plugins
     */
    getAll(): StoredPlugin[] {
        return this.#plugins
    }
}
