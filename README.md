# core

🛠️ Official TypeScript framework for building OMSS-compliant streaming backends

This is a rewrite of https://github.com/omss-spec/framework and will be completely modular. 

The core framework intentionally contains almost no functionality. It acts as a lightweight TypeScript runtime and plugin orchestrator for OMSS-compliant services.

Any additional functionalities (like HTTP, caching, data lookup [(id) resolvers {future proofing}](https://github.com/omss-spec/omss-spec/issues/5) and in the future also things like WS etc.) can be added by registering OMSS plugins into this framework. 

This allows maximal flexibility, while still keeping things standardzied. Until I get this whole thing into a OK shape I will not accept any PR's. To share ideas, please open an issue. 

This will take some time. 

## Naming Conventions

It is important that we use the correct words for what we actually mean, so that we can understand eachother better. Here is a table of a word and it's meaning when talking about it in the OMSS context.

| Word     | Meaning                                                                |
|----------|------------------------------------------------------------------------|
| the spec | The current Open Media Streaming Specification (current version: v1.1) |
| plugin   | Plugins is just a generic term for a piece of software that adds specific features or functionalities to an existing computer program. Please always refer to a specific plugin (or atleast mention it's ecosystem) |
| OMSS Plugin | A Plugin that adds functionality to the OMSS Framework (see example below) |
| Resolver | A Resolver in the OMSS Framework is a *kind of Plugin* that can turn a given ID into useable data for providers. Resolvers should be created for a single ID Provider. |
| ID       | An ID in the OMSS Framework is a unique identifier built of a namespace and a value. [discussion](https://github.com/omss-spec/omss-spec/issues/5). |
| Namespace | A Namespace in the OMSS Framework is a part of the ID that defines to whom (ID Provider) the value of said ID belongs to. |
| ID Provider | An ID Provider in the OMSS Framework is a third party service that can provide data for a given ID (e.g. TMDB) |
| Provider | A Provider in the OMSS Framework is a file, that is home in the consumer repository, that gets called by the OMSS Framework with the data from a Resolver and is responsible for providing streaming sources back. |
| OMSS Server | The OMSS Server is the main class/component of the OMSS Framework. It is responsible for loading and managing all plugins, resolvers, and providers. |

## Planned Technical Documentation

```ts
export type OMSSPluginType<T = void> = (server: OMSSServer, config: T) => Promise<void>
export type OMSSPluginOptions<T> = T | ((server: OMSSServer) => T)

export class OMSSServer {
    private readonly omssConfig: OMSSConfig

    constructor(omssConfig: OMSSConfig) {
        this.omssConfig = omssConfig
    }

    /**
     * Register an OMSS plugin.
     * @param plugin - The plugin to register.
     * @param options - Configuration for the plugin.
     */
    async register<T>(plugin: OMSSPluginType<T>, options: OMSSPluginOptions<T>): Promise<void> {
        const resolvedOptions = typeof options === 'function'
            ? (options as (server: OMSSServer) => T)(this)
            : options

        await plugin(this, resolvedOptions)
    }

    /**
     * Get the OMSS configuration.
     */
    getOMSSConfig(): OMSSConfig {
        return this.omssConfig
    }
}
```

### Philosophy

The core framework intentionally contains almost no functionality.

Its sole responsibility is:

* Managing the OMSS lifecycle
* Providing access to framework configuration
* Registering and orchestrating plugins
* Exposing shared state and APIs between plugins

Everything else is implemented as plugins.

### Example

```ts
import { OMSSServer } from '@omss/core'

import httpPlugin from '@omss/plugin-http'
import cachePlugin from '@omss/plugin-cache'
import resolverPlugin from '@omss/plugin-resolver'

const server = new OMSSServer({
    name: 'My Digitalized Movie Collection'
})

await server.register(httpPlugin, {
    port: 3000
})

await server.register(cachePlugin, {
    ttl: 300
})

await server.register(fsPlugin, {
    path: path.join('\\nas.home\medialib\')
})
```

### Plugin Architecture

Plugins are executed in registration order.

A plugin may:

* Register routes
* Extend the server instance
* Register additional services
* Expose APIs to other plugins
* Hook into OMSS lifecycle events
* **Provide information to providers**

```ts
export interface HTTPPluginConfig {
    port: number
}

export default async function httpPlugin(
    server: OMSSServer,
    config: HTTPPluginConfig
): Promise<void> {
    // Register HTTP transport
}
```

### Planned Official Plugins

* `@omss/plugin-http` - Fastify
* `@omss/plugin-cache` - Memory, Redis
* `@omss/plugin-tmdb` - To serve tmdb information to Providers
* `@omss/plugin-v2` - Future OMSS v2 Compatibility
* `@omss/plugin-auth` - Add basic auth 

Additional plugins can be developed independently as long as they comply with the OMSS plugin API. In the future there might be a registry of plugins (official and community)

### Stability

The API shown above is preliminary and will likely change significantly while the framework is being designed.

No stability guarantees are currently provided until the first public release.
