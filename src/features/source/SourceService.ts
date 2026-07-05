import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import OMSSServer from '@/core/server.js'
import { SourceRegistry } from '@/features/source/SourceRegistry.js'

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
}
