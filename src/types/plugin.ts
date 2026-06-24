import OMSSServer from '@/core/server.js'

/**
 * Plugin with no configuration.
 */
export type OMSSPluginType = (server: OMSSServer) => Promise<void>

/**
 * Plugin with required configuration.
 */
export type OMSSConfiguredPluginType<T> = (server: OMSSServer, config: T) => Promise<void>

/**
 * Any plugin type.
 */
export type UnknownPluginType = OMSSPluginType | OMSSConfiguredPluginType<unknown>

/**
 * Plugin options — either a plain value or a factory that receives
 * the server instance and returns the resolved value.
 */
export type OMSSPluginOptions<T> = T | ((server: OMSSServer) => T)

/**
 * Internal type for storing registered plugins.
 */
export type StoredPlugin = {
    plugin: UnknownPluginType
    options?: unknown | ((server: OMSSServer) => unknown)
}
