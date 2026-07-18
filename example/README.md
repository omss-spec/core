# OMSS Core — Example

This directory contains a comprehensive consumer example for `@omss/core` that demonstrates **every public feature**.

## Run

```bash
npm run example
# or directly:
npx tsx example/example.ts
```

## What's covered

| Feature | Description |
|---|---|
| `OMSSServer` | Server construction with `OMSSConfig` |
| `server.hooks` | All lifecycle hooks (`beforePluginRegister`, `afterPluginRegister`, `pluginRegisterFailed`, `beforeProviderRegister`, `afterProviderRegister`, `providerRegisterFailed`, `beforeGetSources`, `afterGetSources`, `getSourcesFailed`) |
| `server.plugins` | Registering plugins with and without configuration, options-as-factory |
| `server.decorate` | `decorate()`, `hasDecorator()`, `getDecorator()`, dependency checking, duplicate rejection |
| `BaseResolver` | Custom TMDB resolver (`namespace`, `name`, `resolve()`) |
| `BaseProvider` | Custom provider with `catalog`, `supportsId`, `getSources` |
| `ProviderResultEmitter` | `source()`, `subtitle()`, `error()`, `warn()`, `info()`, `debug()`, `emit()`, `fatal()`, `done()`, `utils.source.parseType/parseQuality`, `utils.subtitle.parseFormat` |
| `server.providers.hooks` | Per-provider lifecycle hooks (`debug`, `info`, `warn`, `error`, `source`, `subtitle`, `done`, custom via `emit`) |
| `server.providers.use()` | Registration middleware chain |
| `server.sources.get()` | Full source-gathering round-trip, provider filtering, error scenarios |
| Error types | `OMSSProviderError`, `OMSSResolverError`, `OMSSServerError` |
| `OK` / `ERR` | Result pattern helpers |

## File structure

```
example/
├── example.ts   # Main example entry point
└── README.md    # This file
```
