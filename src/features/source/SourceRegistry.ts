import { UnknownProvider } from '@/types/provider.js'
import { HookRegistry } from '@/features/hooks/HookRegistry.js'
import { OMSSProviderError } from '@/utils/error.js'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

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

    /**
     * This is just a placeholder, because providers get autoregistered as soon as imported. To call this method, that happens, so we don't have to do anything here.
     * @param provider - Provider to register
     */
    registerProvider(provider: UnknownProvider) {
        provider.name
    }

    /**
     * Discovers providers in the specified directory and registers them.
     * @param directory - The directory to search for providers.
     */
    async discoverProviders(directory: string): Promise<void> {
        const absoluteDir = path.resolve(directory)

        const dirExists = await fs
            .access(absoluteDir)
            .then(() => true)
            .catch(() => false)

        if (!dirExists) {
            throw new OMSSProviderError(`Directory "${absoluteDir}" does not exist`)
        }

        const entries = await fs.readdir(absoluteDir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = path.resolve(absoluteDir, entry.name)

            if (entry.isDirectory()) {
                // Recurse into subdirectory
                await this.discoverProviders(fullPath)
                continue
            }

            // Only handle files from here on
            const file = entry.name
            if (!file.endsWith('.js') && !file.endsWith('.ts')) continue
            if (file.includes('.test.') || file.includes('.spec.') || file.endsWith('.d.ts')) continue

            const content = await fs.readFile(fullPath, 'utf-8')

            const looksLikeProvider = content.includes('@RegisterProvider') && content.includes('extends BaseProvider')

            if (!looksLikeProvider) continue

            await import(pathToFileURL(fullPath).href)
        }
    }
}
