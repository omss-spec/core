import { OMSSServer } from "../../core/server.js"
import { OMSSPluginType } from "../../types/index.js"


/**
 * Internal type for storing registered plugins.
 * Uses a function signature that erases type parameters to allow storing plugins with different type parameters.
 */
export type StoredPlugin = {
    plugin: OMSSPluginType<unknown>
    options: unknown | ((server: OMSSServer) => unknown)
}

/**
 * The states of which a plugin can be.
 */
export enum PluginState {
    Registering,
    Registered,
    Unavailable
}