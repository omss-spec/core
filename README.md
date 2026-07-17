# Core

![Codecov](https://img.shields.io/codecov/c/github/omss-spec/core)

This project is a rewrite of the [OMSS Framework](https://github.com/omss-spec/framework) and is being designed from the ground up to be completely modular.

The core framework intentionally contains almost no functionality. Its purpose is to act as a lightweight TypeScript runtime and plugin orchestrator for OMSS-compliant services (OMSS Plugins).

Additional functionality—such as HTTP support, caching, ID resolvers ([ongoing discussion](https://github.com/omss-spec/omss-spec/issues/5)), and eventually features like WebSocket support—can be added by registering OMSS plugins with the framework.

This approach provides maximum flexibility while keeping implementations standardized.

Until the project reaches a more stable state, pull requests will not be accepted. If you would like to share ideas, feedback, or suggestions, please open an issue instead.

Development is still in its early stages and will take some time.

## Naming Conventions

Using precise terminology is important so that everyone understands the same concepts when discussing OMSS. The table below defines the preferred meanings of commonly used terms within the OMSS ecosystem.

| Word            | Meaning                                                                                                                                                                                                                                  | Example/Value                                                                                                          |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| **the spec**    | The current Open Media Streaming Specification (currently v1.1).                                                                                                                                                                         | [OMSS Spec](https://github.com/omss-spec/omss-spec)                                                                    |
| **plugin**      | A generic term for a piece of software that adds features or functionality to an existing program. When possible, refer to the specific plugin or ecosystem being discussed.                                                             | OMSS Plugin, Fastify Plugin, Nuvio Plugin etc.                                                                         |
| **OMSS Plugin** | A plugin that extends the functionality of the OMSS Framework.                                                                                                                                                                           | (see example below)                                                                                                    |
| **Resolver**    | A type of OMSS Plugin that converts a given ID into usable data for providers. Resolvers should generally be implemented for a single ID-Provider. Resolvers will be registered to the resolverService and not the OMSS Server directly. | TBD                                                                                                                    |
| **ID**          | A unique identifier consisting of a namespace and a value (seperated by `:`).                                                                                                                                                            | [Ongoing discussion](https://github.com/omss-spec/omss-spec/issues/5); `tmdb:12345`, `einthusan:6EHy`                  |
| **Namespace**   | The portion of an ID that identifies which ID-Provider owns the value.                                                                                                                                                                   | `tmdb`, `einthusan`                                                                                                    |
| **ID-Provider** | A third-party service capable of providing metadata for a given ID                                                                                                                                                                       | [TMDB](https://www.themoviedb.org/), [Einthusan](https://einthusan.tv/)                                                |
| **Provider**    | A file within a consumer repository that receives resolver data from the OMSS Framework and is responsible for returning streaming sources.                                                                                              | [Example Provider (old framework)](https://github.com/omss-spec/framework/blob/main/examples/providers/my-provider.ts) |
| **OMSS Server** | The primary class/component of the OMSS Framework. It is responsible for loading and managing plugins, resolvers, and providers.                                                                                                         | (see planned documentation below)                                                                                      |

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
        const resolvedOptions = typeof options === 'function' ? (options as (server: OMSSServer) => T)(this) : options

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

Its responsibilities are limited to:

- Managing the OMSS lifecycle
- Providing access to framework configuration
- Registering and orchestrating plugins
- Exposing shared state and APIs between plugins

Everything else should be implemented as a plugin.

### Example

```ts
import { OMSSServer } from '@omss/core'

import httpPlugin from '@omss/plugin-http'
import cachePlugin from '@omss/plugin-cache'
import resolverPlugin from '@omss/plugin-resolver'

const server = new OMSSServer({
    name: 'My Digitalized Movie Collection',
})

await server.plugins.register(httpPlugin, {
    port: 3000,
})

await server.plugins.register(cachePlugin, {
    ttl: 300,
})

await server.plugins.register(fsPlugin, {
    path: path.join('\\nas.home\\medialib\\'),
})
```

### Plugin Architecture

Plugins are executed in the order they are registered.

A plugin may:

- Register routes
- Extend the server instance
- Register additional services
- Expose APIs to other plugins
- Hook into OMSS lifecycle events
- Provide information to providers

```ts
export interface HTTPPluginConfig {
    port: number
}

export default async function httpPlugin(server: OMSSServer, config: HTTPPluginConfig): Promise<void> {
    // Register HTTP transport
}
```

### Planned Official Plugins

- `@omss/plugin-http` — Fastify integration
- `@omss/plugin-cache` — Memory and Redis caching
- `@omss/plugin-tmdb` — Provides TMDB data to providers
- `@omss/plugin-v2` — Future OMSS v2 compatibility
- `@omss/plugin-auth` — Basic authentication support

Additional plugins can be developed independently as long as they comply with the OMSS Plugin API. In the future, an official plugin registry may be introduced for both official and community-maintained plugins.

### Hooks

There are hooks available to hook into the OMSS lifecycle. They follow a naming pattern. More details will be added later. Try to avoid throwing and/or creating loops (some checks are in place to prevent this. not completely foolproof though).

### Middleware

Certain services allow for middleware to be registered. Plugins can use this to extend the functionality of the service. (i.e. caching)

### Stability

The API shown above is preliminary and will likely change significantly while the framework is being designed.

No stability guarantees are provided until the first public release.
