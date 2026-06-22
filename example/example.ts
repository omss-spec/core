import {OMSSServer} from '../src'
import { PluginState } from '../src/services/plugins/types'

interface httpExampleConfig {
    port: number
}

const opt = {
    port: 67
}

const httpPlugin = async (instance: OMSSServer, config?: httpExampleConfig) => {
    console.log('ohh yeah http plugin is live')
}

const secondPlugins = async (instance: OMSSServer, config?: httpExampleConfig) => {
    if (instance.getPluginState(httpPlugin) === PluginState.Unavailable) {
        throw new Error("http required")
    }
}

const server = new OMSSServer({name: "Local testing server"})

// server.register(httpPlugin)
server.register(secondPlugins)