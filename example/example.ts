import { OMSSServer } from '../src/index.js'

const httpPlugin = async (instance: OMSSServer) => {
    console.log('HTTP plugin registered')
}

const server = new OMSSServer({ name: 'Local testing server' })

server.hooks.add('onRegister', (payload) => {
    console.log(`Registering plugin: ${payload.plugin.name}`)
})

await server.plugins.register(httpPlugin)
