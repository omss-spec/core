import { UnknownProvider } from '@/types/provider.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { OMSSProviderError } from '@/utils/error.js'

type ProviderConstructor<T extends UnknownProvider = UnknownProvider> = new () => T

/**
 * Internal registry for storing providers.
 */
const ProviderRegistry = {
    providers: [] as ProviderConstructor[],
}

/**
 * Decorator for registering providers. Should be added to every Provider class.
 * @example ```
 * @RegisterProvider() // <-- Do this. Otherwise, OMSS won't know about it.
 * class MyProvider extends OMSSProvider<...> {
 *     // Provider implementation
 * }
 * ```
 * @decorator
 */
export function RegisterProvider() {
    return function <T extends UnknownProvider>(Provider: ProviderConstructor<T>, _context: ClassDecoratorContext) {
        ProviderRegistry.providers.push(Provider)
    }
}

/**
 * Registry responsible for keeping and managing OMSS Providers and also their resolvers.
 *
 * Providers are expected to contain resolvers too.
 */
export class SourceRegistry {
    /**
     * Registered providers.
     */
    readonly #providers: UnknownProvider[] = []
    readonly #hookRegistry: HookRegistry
    #insideOnProviderRegister = false

    constructor(hookRegistry: HookRegistry) {
        this.#hookRegistry = hookRegistry
    }

    /**
     * Initializes all registered providers and runs the `onProviderRegister` hook for each provider.
     * @returns - The number of providers that were initialized.
     */
    async initializeProviders(): Promise<number> {
        while (ProviderRegistry.providers.length > 0) {
            const Provider = ProviderRegistry.providers.shift()
            if (!Provider) break

            const provider = new Provider()

            if (this.#insideOnProviderRegister) {
                throw new OMSSProviderError('Providers cannot be registered during onProviderRegister')
            }

            if (this.#providers.some((p) => p.id === provider.id)) {
                throw new OMSSProviderError(`Provider "${provider.id}" already registered`)
            }

            this.#insideOnProviderRegister = true
            try {
                await this.#hookRegistry.run('onProviderRegister', { provider })
            } finally {
                this.#insideOnProviderRegister = false
            }

            this.#providers.push(provider)
        }
        return this.#providers.length
    }
}
