import { HookRegistry } from '@/services/hooks/HookRegistry.js'
import { HookService } from '@/services/hooks/HookService.js'
import { PluginRegistry } from '@/services/plugins/PluginRegistry.js'
import { OMSSConfig } from '@/types/config.js'
import { PluginService } from '@/services/plugins/PluginService.js'

/**
 * Core server class for OMSS.
 */
class OMSSServer {
    readonly hooks: HookService
    readonly plugins: PluginService
    readonly #hooksRegistry: HookRegistry
    readonly #config: OMSSConfig

    /**
     * Creates a new OMSSServer instance.
     *
     * @param config - Immutable server configuration
     */
    constructor(config: OMSSConfig) {
        this.#config = config
        this.#hooksRegistry = new HookRegistry()
        this.hooks = new HookService(this.#hooksRegistry)
        this.plugins = new PluginService(this, new PluginRegistry(), this.#hooksRegistry)
    }

    /**
     * Get the OMSS Config from the constructor
     * @returns the initialised OMSS Config
     */
    getConfig(): OMSSConfig {
        return this.#config
    }
}

export default OMSSServer
