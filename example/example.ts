import { OMSSServer } from '../src/index.js'

export const server = new OMSSServer({ name: 'example' })
await server.sources.discoverProviders('.')
const number = await server.sources.initializeProviders()
console.log(`Initialized ${number} providers.`)
