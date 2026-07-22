import { HookService, OMSSConfig, OMSSServer, ProviderHooks } from '../src/index.js'

const config: OMSSConfig = { name: 'omss-example' }
const server = new OMSSServer(config)

const reg = new HookService<ProviderHooks>()

server.sources.getSources('tt1234567', { providerId: 'provider1', providerHookService: reg })
