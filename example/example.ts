import type { OMSSConfig } from '../src/index.js'
import { OMSSServer } from '../src/index.js'

const config: OMSSConfig = { name: 'omss-example' }
const server = new OMSSServer(config)
// now you can do cool things with this server instance!
