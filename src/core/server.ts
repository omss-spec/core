import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { HookService } from '@/features/hooks/HookService.js'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginService } from '@/features/plugins/PluginService.js'
import { OMSSServerError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'
import { SourceService } from '@/features/source/SourceService.js'
import { SourceRegistry } from '@/features/source/SourceRegistry.js'

/**
 * Core server class for OMSS.
 */
export class OMSSServer {
    readonly hooks: HookService
    readonly plugins: PluginService
    readonly sources: SourceService
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
        const sourceRegistry = new SourceRegistry(hooksRegistry)

        this.hooks = new HookService(hooksRegistry)
        this.plugins = new PluginService(this, pluginRegistry, hooksRegistry)
        this.sources = new SourceService(this, sourceRegistry, hooksRegistry)
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
            throw new OMSSServerError(`Decorator "${name}" already exists`, {
                cause: {
                    existing: this[name as keyof this],
                },
            })
        }

        for (const dep of deps) {
            if (!this.hasDecorator(dep)) {
                throw new OMSSServerError(`"${name}" depends on "${dep}", which does not exist`)
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
            throw new OMSSServerError(`Decorator "${name}" not found`)
        }

        return this[name as keyof this] as T
    }
}

export default OMSSServer
