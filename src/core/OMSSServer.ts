import { createHookRegistry } from '@/features/hooks/HookRegistry.js'
import { createHookService, type HookService } from '@/features/hooks/HookService.js'
import { createPluginRegistry } from '@/features/plugins/PluginRegistry.js'
import { createPluginService, type PluginService } from '@/features/plugins/PluginService.js'
import { OMSSServerError } from '@/utils/error.js'
import type { OMSSConfig } from '@/types/config.js'
import { createSourceService, type SourceService } from '@/features/source/SourceService.js'
import { createProviderRegistry } from '@/features/providers/ProviderRegistry.js'
import { ERR, OK } from '@/utils/utils.js'
import { type Result } from '@/types/utils.js'
import { createProviderService, type ProviderService } from '@/features/providers/ProviderService.js'
import { type OMSSHooks } from '@/types/hooks.js'
import { createExtractorService, type ExtractorService } from '@/features/extractors/ExtractorService.js'
import { createExtractorRegistry } from '@/features/extractors/ExtractorRegistry.js'

/**
 * The core OMSS server - the framework's public entry point.
 *
 * Owns the shared registries/services (hooks, plugins, providers, extractors,
 * sources) every plugin is wired into, and lets plugins extend the instance
 * itself via `decorate()`.
 *
 * @example
 * ```ts
 * const server = new OMSSServer({ name: 'My Media Server' })
 *
 * await server.plugins.register(httpPlugin, { port: 3000 })
 * ```
 */
export class OMSSServer {
    /**
     * Manages OMSS lifecycle hooks. See {@link HookService}.
     */
    readonly hooks: HookService<OMSSHooks>
    /**
     * Manages plugin registration and state. See {@link PluginService}.
     */
    readonly plugins: PluginService
    /**
     * Manages provider registration and catalogs. See {@link ProviderService}.
     */
    readonly providers: ProviderService
    /**
     * Gathers streaming sources for an OMSS ID. See {@link SourceService}.
     */
    readonly sources: SourceService
    /**
     * Manages extractor registration and lookup. See {@link ExtractorService}.
     */
    readonly extractors: ExtractorService
    readonly #config: OMSSConfig

    /**
     * Creates a new {@link OMSSServer} instance.
     *
     * @param config - The immutable server configuration.
     */
    constructor(config: OMSSConfig) {
        this.#config = config

        const hooksRegistry = createHookRegistry<OMSSHooks>()
        const extractorRegistry = createExtractorRegistry()
        const pluginRegistry = createPluginRegistry(this)
        const providerRegistry = createProviderRegistry()

        this.hooks = createHookService<OMSSHooks>(hooksRegistry)
        this.extractors = createExtractorService(extractorRegistry, hooksRegistry)
        this.plugins = createPluginService(pluginRegistry, hooksRegistry)
        this.providers = createProviderService(providerRegistry, hooksRegistry)
        this.sources = createSourceService(this, providerRegistry, hooksRegistry, this.extractors)
    }

    /**
     * The server configuration passed to the constructor.
     *
     * @returns The immutable server configuration.
     */
    get config(): Readonly<OMSSConfig> {
        return this.#config
    }

    /**
     * Decorates the server instance with a new, readonly property.
     *
     * @remarks
     * This is how plugins extend the server with their own public API
     * surface (e.g. an HTTP plugin decorating `server.http`).
     *
     * @typeParam T - The type of the value being decorated.
     * @param name - The name of the property to decorate.
     * @param value - The value to assign to the property.
     * @param deps - Names of other decorators this one depends on. Registration fails if any is missing.
     * @returns The decorated property's name, or an error if `name` already exists or a dependency is missing.
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
     * Checks whether a decorator with the given name exists.
     *
     * @param name - The name of the decorator to check.
     * @returns `true` if the decorator exists, `false` otherwise.
     */
    hasDecorator(name: string): boolean {
        return Object.hasOwn(this, name)
    }

    /**
     * Gets a decorated property by its name.
     *
     * @typeParam T - The expected type of the decorated value.
     * @param name - The name of the property to retrieve.
     * @returns The decorated value, or an error if no decorator with that name exists.
     */
    getDecorator<T>(name: string): Result<T, OMSSServerError> {
        if (!Object.hasOwn(this, name)) {
            return ERR(new OMSSServerError(`Decorator "${name}" not found`))
        }

        return OK(this[name as keyof this] as T)
    }
}

export default OMSSServer
