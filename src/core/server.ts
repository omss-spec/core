import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { HookService } from '@/features/hooks/HookService.js'
import { PluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { PluginService } from '@/features/plugins/PluginService.js'
import { OMSSServerError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'
import { SourceService } from '@/features/source/SourceService.js'
import { ProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { ERR, OK } from '@/utils/utils.js'
import { Result } from '@/types/utils.js'
import { ProviderService } from '@/features/providers/ProviderService.js'
import { OMSSHooks, ProviderHooks } from '@/types/hooks.js'
import { ExtractorService } from '@/features/extractors/ExtractorService.js'
import { ExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'

/**
 * Core server class for OMSS.
 */
export class OMSSServer {
    readonly hooks: HookService<OMSSHooks>
    readonly plugins: PluginService
    readonly providers: ProviderService
    readonly sources: SourceService
    readonly extractors: ExtractorService
    readonly #config: OMSSConfig

    /**
     * Creates a new OMSSServer instance.
     *
     * @param config - Immutable server configuration
     */
    constructor(config: OMSSConfig) {
        this.#config = config

        const hooksRegistry = new HookRegistry<OMSSHooks>()
        const providerHookRegistry = new HookRegistry<ProviderHooks>()
        const extractorRegistry = new ExtractorRegistry()
        const pluginRegistry = new PluginRegistry(this)
        const providerRegistry = new ProviderRegistry()

        this.hooks = new HookService<OMSSHooks>(hooksRegistry)
        this.extractors = new ExtractorService(extractorRegistry)
        this.plugins = new PluginService(this, pluginRegistry, hooksRegistry)
        this.providers = new ProviderService(providerRegistry, hooksRegistry, providerHookRegistry)
        this.sources = new SourceService(this, providerRegistry, hooksRegistry, providerHookRegistry, this.extractors)
    }

    /**
     * Get the OMSS Config from the constructor
     * @returns the initialised OMSS Config
     */
    get config(): Readonly<OMSSConfig> {
        return this.#config
    }

    /**
     * Decorate the OMSSServer instance with a new property.
     * @param name - The name of the property to be decorated.
     * @param value - The value to be assigned to the property.
     * @param deps - An array of dependency names.
     * @returns The name of the decorated property in the {@link Result} object.
     */
    decorate<T>(name: string, value: T, deps: string[] = []): Result<string, OMSSServerError> {
        if (Object.hasOwn(this, name)) {
            return ERR(
                new OMSSServerError(`Decorator "${name}" already exists`, {
                    cause: {
                        existing: this[name as keyof this],
                    },
                })
            )
        }

        for (const dep of deps) {
            if (!this.hasDecorator(dep)) {
                return ERR(new OMSSServerError(`"${name}" depends on "${dep}", which does not exist`))
            }
        }

        // modify the instance to make the decorator available as a property
        Object.defineProperty(this, name, {
            value,
            writable: false,
            configurable: false,
            enumerable: true,
        })

        return OK(name)
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
     * @returns The decorated property value in the {@link Result} object.
     */
    getDecorator<T>(name: string): Result<T, OMSSServerError> {
        if (!Object.hasOwn(this, name)) {
            return ERR(new OMSSServerError(`Decorator "${name}" not found`))
        }

        return OK(this[name as keyof this] as T)
    }
}

export default OMSSServer
