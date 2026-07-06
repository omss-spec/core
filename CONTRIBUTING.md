Contributing to this project is currently restricted to authorized contributors only.

For contributors, please follow these guidelines/please note:

- The entrypoint of the project is `src/index.js`, which exports everything from `src/public-api.js`.
- The entrypoint class of the Project is `src/core/server.js` or OMSSServer. This server instance is the whole handler which is exposed to the outside world. Consumers can register hooks, plugins, providers, and resolvers (etc.) there.
- Conventions is: keep the server.ts as small as possible.
- Features live in the `src/features` directory by feature. Every feature can have a public-api.js which exports the feature's public API/utils. See examples in `src/features/plugins`.
- Registries are internal (not exposed to the outside world).
- Services are semi-wrappers around the registries and are exposed to the outside world.
- To keep stuff hidden, use the `#` prefix.
- Types are in `src/types` in the respective `feature.ts` file
- Tests are in `src/tests` and must be written for each feature.
- Test coverage must be 100% for each feature.
- Use `npm run format` to format the code before committing.
- Use `@/` to import from the project's source code.
- **Write accurate and descriptive JSdoc comments wherever possible.**
- Always follow best practices and keep extensibility in mind.
