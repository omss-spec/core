import { OMSSServer } from '../src/index.js'

export const server = new OMSSServer({ name: 'example' })

const numb = await server.sources.initializeProviders()
console.log(`Initialized ${numb} providers.`)
