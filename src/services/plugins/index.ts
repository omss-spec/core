import type { OMSSPluginType, OMSSPluginOptions } from '../../types/index.js'
import type { OMSSServer } from '../../core/server.js'
import type { StoredPlugin } from './types.js'
import { PluginState } from './types.js'

/**
 * Registry responsible for executing and managing OMSS Plugins.
 *
 * Plugins are executed when added.
 */
export class PluginRegistry {
    /**
     * Registered plugins and their options.
     */
    readonly #plugins: StoredPlugin[] = []

    /**
     * Current state of plugins.
     */
    readonly #states = new Map<OMSSPluginType<unknown>, PluginState>()

    /**
     * Registration stack used for circular dependency detection.
     */
    readonly #stack: OMSSPluginType<unknown>[] = []

    /**
     * Adds and runs a plugin with its options.
     *
     * @typeParam T - Plugin options type.
     * @param instance - The server instance to pass to the plugin.
     * @param plugin - The plugin function to register.
     * @param options - Plugin options or a factory function that resolves options.
     */
    async add<T>(instance: OMSSServer, plugin: OMSSPluginType<T>, options?: OMSSPluginOptions<T>): Promise<void> {
        const typedPlugin = plugin as OMSSPluginType<unknown>

        const state = this.#states.get(typedPlugin)

        if (state === PluginState.Registering) {
            const chain = [...this.#stack, typedPlugin].map((p) => p.name).join(' -> ')

            throw new Error(`Circular plugin dependency detected: ${chain}`)
        }

        if (state === PluginState.Registered) {
            throw new Error(`Plugin "${plugin.name}" is already registered`)
        }

        const resolved = typeof options === 'function' ? (options as (server: OMSSServer) => T)(instance) : options

        this.#states.set(typedPlugin, PluginState.Registering)
        this.#stack.push(typedPlugin)

        try {
            await plugin(instance, resolved)

            this.#plugins.push({
                plugin: typedPlugin,
                options,
            })

            this.#states.set(typedPlugin, PluginState.Registered)
        } catch (err) {
            this.#states.delete(typedPlugin)
            throw err
        } finally {
            this.#stack.pop()
        }
    }

    /**
     * Get current plugin state.
     */
    getState<T>(plugin: OMSSPluginType<T>): PluginState {
        return this.#states.get(plugin as OMSSPluginType<unknown>) ?? PluginState.Unavailable
    }
}
