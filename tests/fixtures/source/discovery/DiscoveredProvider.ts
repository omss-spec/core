import { RegisterProvider } from '@/features/source/SourceRegistry.js'

// @RegisterProvider
// extends BaseProvider

class DiscoveredProvider {
    id = 'discovered-provider'
    name = 'Discovered Provider'
    enabled = true
    baseUrl = 'https://example.com'
    headers = {}
    supportedIds = ['*']
    resolver = {
        namespace: 'tmdb',
        name: 'fixture-resolver',
        resolve: async () => ({ ok: true, value: { title: 'fixture' } }),
    }
    getSources = async () => ({ ok: true, value: { sources: ['fixture-source'] } })
}

RegisterProvider()(DiscoveredProvider as unknown as new () => any)

export {}
