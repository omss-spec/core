<div align="center">

<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://raw.githubusercontent.com/omss-spec/docs/refs/heads/main/assets/logo-dark.svg"
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="https://raw.githubusercontent.com/omss-spec/docs/refs/heads/main/assets/logo-light.svg"
  />
  <img
    src="https://raw.githubusercontent.com/omss-spec/docs/refs/heads/main/assets/logo-light.svg"
    width="500"
    height="auto"
    alt="OMSS Core"
  />
</picture>

# Core

[![CI](https://github.com/omss-spec/core/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/omss-spec/core/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@omss/core.svg?style=flat)](https://www.npmjs.com/package/@omss/core)
[![npm downloads](https://img.shields.io/npm/dm/@omss/core.svg?style=flat)](https://www.npmjs.com/package/@omss/core)
[![Codecov](https://img.shields.io/codecov/c/github/omss-spec/core)](https://codecov.io/gh/omss-spec/core)
[![Security Responsible Disclosure](https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg)](https://github.com/omss-spec/core/blob/main/SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

</div>

<br />

**OMSS Core** is the official TypeScript runtime and plugin orchestrator for building [OMSS-compliant](https://github.com/omss-spec/omss-spec) media streaming services.

The core is intentionally minimal. Its sole responsibility is to manage the OMSS lifecycle, load plugins, and expose shared states between them. All additional functionality — HTTP transport, caching, resolvers, auth — is added via **OMSS Plugins**.

> [!NOTE]
> The project is in beta. The API shown here is preliminary.


### Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Features](#features)
- [Documentation](#documentation-_coming-soon_)
- [Ecosystem](#ecosystem)
- [ID Convention](#id-convention)
- [Contributing](#contributing)
- [Support](#support)
- [Team](#team)
- [Acknowledgments](#acknowledgments)
- [License](#license)
- [Dependencies](#dependencies)


## Install

```sh
npm install @omss/core
```

```sh
yarn add @omss/core
```

```sh
pnpm add @omss/core
```


## Quick Start

```ts
import { OMSSServer } from '@omss/core'
import httpPlugin from '@omss/plugin-http'
import cachePlugin from '@omss/plugin-cache'

const server = new OMSSServer({
  name: 'My Media Server',
})

await server.plugins.register(httpPlugin, {
  port: 3000,
})
// and many other features.
```

Do you want to know more? Check out the [documentation](https://omss.mintlify.site) for a more in-depth guide.


## Features

- **Modular by design**: The core ships with almost no functionality. Everything is a plugin.
- **OMSS Lifecycle**: Use hooks to get notified of OMSS lifecycle events. 
- **Fully typed**: Built in TypeScript with full type exports for **Everything** (no `any` used!)
- **Extensible**: OMSS Core is fully extensible via its hooks, plugins, and decorators.
- **Middleware support**: Certain services expose middleware chains that plugins can extend (e.g., caching layers).
- **Developer friendly**: The framework is built to be very expressive and help developers in their daily use without sacrificing performance.
- **Standards-compliant**: Built with the [OMSS Specification](https://github.com/omss-spec/omss-spec) in mind.


## Documentation _(coming soon)_

The documentation is currently under development. You can find the latest version at [https://omss.mintlify.site](https://omss.mintlify.site).


## Ecosystem

We are working on a comprehensive ecosystem of plugins that can be used to extend OMSS.

The current Open Media Streaming Specification can always be found at [https://github.com/omss-spec/omss-spec](https://github.com/omss-spec/omss-spec).

### Plugins

An official plugin registry is planned for the future.

**Official Plugins** (maintained by the OMSS team):

> [!NOTE]
> These plugins are a WIP.

| Plugin               | Description                  |
|:---------------------|:-----------------------------|
| `@omss/plugin-http`  | HTTP transport via Fastify   |
| `@omss/plugin-cache` | Memory and Redis caching     |
| `@omss/plugin-auth`  | Basic authentication support |


### Resolvers

Resolvers are used to resolve OMSS IDs to media metadata.

**Official Resolvers** (maintained by the OMSS team):

> [!NOTE]
> These resolvers are a WIP.

| Resolver              | Description                  |
|:----------------------|:-----------------------------|
| `@omss/resolver-tmdb` | TMDB resolver                |


## ID Convention

IDs follow the format `<namespace>:<value_1>:<value_2>:...:<value_n>`. Values can contain any character — use URL encoding if your value includes `:` or whitespaces. Values are URL-decoded during parsing.

However, the following namespaces are reserved for the OMSS specification and must follow the rules below. More namespaces may be added in the future:

**TMDB:**
- Movie: `tmdb:<movie_id>` — e.g., `tmdb:155`
- TV Episode: `tmdb:<show_id>:<season>:<episode>` — e.g., `tmdb:1396:3:7`

> [!NOTE]
> All values must be natural numbers (≥ 1), except `season_number` which may be `0` (specials).

**IMDb** (Movies and TV Episodes only — not series):
- Movie: `imdb:tt<digits>` — e.g., `imdb:tt0468569`
- TV Episode: `imdb:tt<digits>` — e.g., `imdb:tt1480055`

> [!NOTE]
> Valid IMDb IDs consist of the prefix `tt` followed by exactly seven digits.

A full list of supported namespaces and their values can be found in the [OMSS Specification](https://github.com/omss-spec/omss-spec) and the [docs](https://omss.mintlify.site) (coming soon).


## Contributing

Whether reporting bugs, discussing improvements, or writing code — contributions are welcome. Please read the [CONTRIBUTING](./CONTRIBUTING.md) guidelines before opening a pull request.


## Support

We are active on [GitHub Discussions](https://github.com/orgs/omss-spec/discussions).

## Team

OMSS Core (and its plugins) is the result of a great community (alphabetically sorted).

**Lead Maintainers:**
- [**@An0n-00**](https://github.com/An0n-00), [**@An0n-01**](https://github.com/An0n-01), https://www.npmjs.com/~an0n-000

**Contributors:**
- [**@anochj**](https://github.com/anochj)
- [**@autovalue**](https://github.com/autovalue)
- [**@LorisRue**](https://github.com/lorisrue), https://www.npmjs.com/~lorisrue

_(Join us by contributing!)_

## Acknowledgments

This project (rather it's ecosystem/API) is inspired by [Fastify](https://github.com/fastify/fastify). 

## License

Licensed under [MIT](./LICENSE).

## Dependencies

This is a pure TypeScript project, meaning it has no production dependencies.
