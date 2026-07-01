import { HookRegistry } from '@/services/hooks/HookRegistry.js'
import { HookService } from '@/services/hooks/HookService.js'
import { PluginRegistry } from '@/services/plugins/PluginRegistry.js'
import type { OMSSConfig } from '@/types/config.js'
import { PluginService } from '@/services/plugins/PluginService.js'

/**
 * Core server class for OMSS.
 */
export class OMSSServer {
    readonly hooks: HookService
    readonly plugins: PluginService
    readonly #config: OMSSConfig

    /**
     * Creates a new OMSSServer instance.
     *
     * @param config - Immutable server configuration
     */
    constructor(config: OMSSConfig) {
        this.#config = config

        const hooksRegistry = new HookRegistry()
        const pluginRegistry = new PluginRegistry()

        this.hooks = new HookService(hooksRegistry)
        this.plugins = new PluginService(this, pluginRegistry, hooksRegistry)
    }

    /**
     * Get the OMSS Config from the constructor
     * @returns the initialised OMSS Config
     */
    getConfig(): OMSSConfig {
        return this.#config
    }

    /**
     * Decorate the OMSSServer instance with a new property.
     * @param name - The name of the property to be decorated.
     * @param value - The value to be assigned to the property.
     * @param deps - An array of dependency names.
     */
    decorate<T>(name: string, value: T, deps: string[] = []): void {
        if (Object.hasOwn(this, name)) {
            throw new Error(`Decorator "${name}" already exists`)
        }

        for (const dep of deps) {
            if (!this.hasDecorator(dep)) {
                throw new Error(`"${name}" depends on "${dep}"`)
            }
        }

        // modify the instance to make the decorator available as a property
        Object.defineProperty(this, name, {
            value,
            writable: false,
            configurable: false,
            enumerable: true,
        })
    }

    /**
     * Check if a decorator with the given name exists.
     * @param name - The name of the decorator to check.
     * @returns True if the decorator exists, false otherwise.
     */
    hasDecorator(name: string): boolean {
        return Object.hasOwn(this, name)
    }

    /**
     * Get a decorated property by its name.
     * @param name - The name of the property to retrieve.
     * @returns The decorated property value.
     */
    getDecorator<T>(name: string): T {
        if (!Object.hasOwn(this, name)) {
            throw new Error(`Decorator "${name}" not found`)
        }

        return this[name as keyof this] as T
    }
}

export default OMSSServer
