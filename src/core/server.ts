import type { OMSSConfig, OMSSPluginType, OMSSPluginOptions } from '../types/index.js'

export class OMSSServer {
    readonly #config: OMSSConfig

    constructor(config: OMSSConfig) {
        this.#config = config
    }

    /**
     * Register an OMSS plugin. Plugins run in registration order.
     */
    async register<T>(plugin: OMSSPluginType<T>, options: OMSSPluginOptions<T>): Promise<void> {
        const resolved = typeof options === 'function' ? (options as (server: OMSSServer) => T)(this) : options

        await plugin(this, resolved)
    }

    getConfig(): OMSSConfig {
        return this.#config
    }
}
