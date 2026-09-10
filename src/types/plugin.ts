import type OMSSServer from '@/core/OMSSServer.js'

/**
 * A plugin that takes no configuration.
 *
 * @param server - The server instance the plugin is being registered against.
 */
export type OMSSPluginType = (server: OMSSServer) => Promise<void>

/**
 * A plugin that requires configuration.
 *
 * @typeParam T - The shape of the plugin's configuration.
 * @param server - The server instance the plugin is being registered against.
 * @param config - The resolved plugin configuration.
 */
export type OMSSConfiguredPluginType<T> = (server: OMSSServer, config: T) => Promise<void>

/**
 * Either plugin shape - configless or configured. Used where the specific
 * plugin signature isn't known ahead of time (e.g. registries).
 */
export type UnknownPluginType = OMSSPluginType | OMSSConfiguredPluginType<unknown>

/**
 * Options passed to a configured plugin at registration time.
 *
 * Either a plain value or a factory that receives the server instance and
 * returns the resolved value.
 *
 * @typeParam T - The shape of the plugin's configuration.
 */
export type OMSSPluginOptions<T> = T | ((server: OMSSServer) => T)
