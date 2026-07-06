import { OMSSServer } from '../src/index.js'

export const server = new OMSSServer({ name: 'example' })
await server.sources.discoverProviders('.')
const res = await server.sources.initializeProviders()
if (res.ok) console.log(`Initialized ${res.value} providers.`)

const result = await server.sources.getSources('tmdb:155')
if (result.ok) {
    console.log(result.value)
} else {
    console.error(result.error)
}
