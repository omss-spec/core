import type { OMSSConfiguredPluginType, OMSSPluginOptions, OMSSPluginType, UnknownPluginType } from '@/types/plugin.js'
import type OMSSServer from '@/core/OMSSServer.js'
import { PluginState } from '@/features/plugins/PluginState.js'
import { OMSSPluginError } from '@/utils/error.js'
import { type Result } from '@/types/utils.js'
import { ERR, OK } from '@/utils/utils.js'

/**
 * Registry responsible for executing and managing OMSS Plugins.
 *
 * Plugins are executed when added.
 */
export interface PluginRegistry {
    add(plugin: OMSSPluginType): Promise<Result<PluginState.Registered, OMSSPluginError>>

    add<T>(plugin: OMSSConfiguredPluginType<T>, options: OMSSPluginOptions<T>): Promise<Result<PluginState.Registered, OMSSPluginError>>

    /**
     * Get the current plugin state.
     */
    getState<T>(plugin: UnknownPluginType | OMSSPluginType | OMSSConfiguredPluginType<T>): PluginState
}

/**
 * Creates a new {@link PluginRegistry}.
 *
 * @param server - The OMSS server instance plugins will be executed against.
 */
export function createPluginRegistry(server: OMSSServer): PluginRegistry {
    /**
     * States of plugin x
     */
    const states = new Map<UnknownPluginType, PluginState>()

    /**
     * Registration stack used for circular dependency detection.
     */
    const stack: UnknownPluginType[] = []

    /**
     * Adds and runs a plugin with its options.
     *
     * @param plugin - The plugin function to register.
     * @param options - Plugin options or a factory function that resolves options.
     */
    async function add(plugin: UnknownPluginType, options?: unknown): Promise<Result<PluginState.Registered, OMSSPluginError>> {
        // Check whether this plugin is already known
        const state = states.get(plugin)

        if (state === PluginState.Registering) {
            const chain = [...stack, plugin].map((p) => p.name).join(' -> ')

            return ERR(new OMSSPluginError(`Circular plugin dependency detected: ${chain}`))
        }

        if (state === PluginState.Registered) {
            return ERR(new OMSSPluginError(`Plugin "${plugin.name}" is already registered`))
        }

        // Start registering
        states.set(plugin, PluginState.Registering)
        stack.push(plugin)

        // Build options if a factory function is provided
        const resolved = typeof options === 'function' ? (options as (server: OMSSServer) => unknown)(server) : options

        try {
            if (plugin.length === 1) {
                // execute the plugin with the server instance
                await (plugin as OMSSPluginType)(server)
            } else {
                // execute the plugin with the server instance and resolved options
                await plugin(server, resolved)
            }

            states.set(plugin, PluginState.Registered)
            return OK(PluginState.Registered)
        } catch (err) {
            states.delete(plugin)
            return ERR(err instanceof OMSSPluginError ? err : new OMSSPluginError(String(err), { cause: err }))
        } finally {
            stack.pop()
        }
    }

    return {
        add,

        getState(plugin) {
            return states.get(plugin as UnknownPluginType) ?? PluginState.Unavailable
        },
    }
}
