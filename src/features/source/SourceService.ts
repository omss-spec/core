import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import OMSSServer from '@/core/server.js'
import { SourceRegistry } from '@/features/source/SourceRegistry.js'
import { UnknownProvider } from '@/types/provider.js'

/**
 * The public API for resolving sources for media.
 */
export class SourceService {
    readonly #sourceRegistry: SourceRegistry
    readonly #hookRegistry: HookRegistry
    readonly #omssServer: OMSSServer

    constructor(omssServer: OMSSServer, sourceRegistry: SourceRegistry, hookRegistry: HookRegistry) {
        this.#omssServer = omssServer
        this.#sourceRegistry = sourceRegistry
        this.#hookRegistry = hookRegistry
    }

    /**
     * Initializes all registered providers and runs the `onProviderRegister` hook for each provider.
     * Make sure that your providers are registered before calling this method.
     * @example ```typescript
     * @RegisterProvider() // <-- Do this. Otherwise, OMSS won't know about it.
     * class MyProvider extends OMSSProvider<...> {
     *     // Provider implementation
     * }
     * ```
     * @see RegisterProvider
     * @returns - The number of providers that were initialized.
     */
    async initializeProviders() {
        return await this.#sourceRegistry.initializeProviders()
    }

    /**
     * Registers a provider with the source registry.
     * NOTE: You still need {@link RegisterProvider} decorator to register your provider.
     * @param provider - Provider to register
     */
    registerProvider(provider: UnknownProvider) {
        return this.#sourceRegistry.registerProvider(provider)
    }

    /**
     * Discovers providers in the specified directory and registers them.
     * @param directory - The directory to search for providers.
     */
    async discoverProviders(directory: string) {
        return await this.#sourceRegistry.discoverProviders(directory)
    }
}
