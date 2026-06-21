import type { OMSSServer } from '../core/server.js'

/** 
 * An OMSS plugin function. 
*/
export type OMSSPluginType<T = void> = (
  server: OMSSServer,
  config: T,
) => Promise<void>

/**
 * Plugin options — either a plain value or a factory that receives
 * the server instance and returns the resolved value.
 */
export type OMSSPluginOptions<T> = T | ((server: OMSSServer) => T)
