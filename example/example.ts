import { OMSSServer } from '../src/index.js'

export const server = new OMSSServer({ name: 'example' })
await server.sources.discoverProviders('.')
const number = await server.sources.initializeProviders()
console.log(`Initialized ${number} providers.`)

const result = await server.sources.getSources('tmdb:155', {
    abortSignal: AbortSignal.timeout(500),
})
if (result.ok) {
    console.log(result.value)
} else {
    console.error(result.error)
}
