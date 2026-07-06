import type { OMSSConfiguredPluginType, OMSSPluginOptions, OMSSPluginType, StoredPlugin, UnknownPluginType } from '@/types/plugin.js'
import OMSSServer from '@/core/server.js'
import { PluginState } from '@/features/plugins/plugin-state.js'
import { OMSSPluginError } from '@/utils/error.js'
import { Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'

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
    readonly #states = new Map<UnknownPluginType, PluginState>()

    /**
     * Registration stack used for circular dependency detection.
     */
    readonly #stack: UnknownPluginType[] = []

    async add(instance: OMSSServer, plugin: OMSSPluginType): Promise<Result<PluginState.Registered, OMSSPluginError>>

    async add<T>(instance: OMSSServer, plugin: OMSSConfiguredPluginType<T>, options: OMSSPluginOptions<T>): Promise<Result<PluginState.Registered, OMSSPluginError>>

    /**
     * Adds and runs a plugin with its options.
     *
     * @typeParam T - Plugin options type.
     * @param instance - The server instance to pass to the plugin.
     * @param plugin - The plugin function to register.
     * @param options - Plugin options or a factory function that resolves options.
     */
    async add(instance: OMSSServer, plugin: UnknownPluginType, options?: unknown): Promise<Result<PluginState.Registered, OMSSPluginError>> {
        // Check whether this plugin is already known
        const state = this.#states.get(plugin)

        if (state === PluginState.Registering) {
            const chain = [...this.#stack, plugin].map((p) => p.name).join(' -> ')

            return ERR(new OMSSPluginError(`Circular plugin dependency detected: ${chain}`))
        }

        if (state === PluginState.Registered) {
            return ERR(new OMSSPluginError(`Plugin "${plugin.name}" is already registered`))
        }

        // Start registering
        this.#states.set(plugin, PluginState.Registering)
        this.#stack.push(plugin)

        // Build options if a factory function is provided
        const resolved = typeof options === 'function' ? (options as (server: OMSSServer) => unknown)(instance) : options

        try {
            // Check if the plugin has a single argument
            if (plugin.length === 1) {
                // execute the plugin with the server instance
                await (plugin as OMSSPluginType)(instance)
            } else {
                // execute the plugin with the server instance and resolved options
                await plugin(instance, resolved)
            }

            // finished executing the plugin, mark it as registered
            this.#plugins.push({
                plugin,
                options,
            })
            this.#states.set(plugin, PluginState.Registered)
            return OK(PluginState.Registered)
        } catch (err) {
            this.#states.delete(plugin)
            return ERR(err instanceof OMSSPluginError ? err : new OMSSPluginError(String(err), { cause: err }))
        } finally {
            this.#stack.pop()
        }
    }

    /**
     * Get the current plugin state.
     */
    getState(plugin: UnknownPluginType): PluginState {
        return this.#states.get(plugin) ?? PluginState.Unavailable
    }
}
