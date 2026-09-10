# AGENTS.md

## Project

**@omss/core** - the official TypeScript runtime and plugin orchestrator for [OMSS](https://github.com/omss-spec/omss-spec)-compliant media streaming services. Intentionally minimal: manages plugin lifecycle, hooks, resolvers, providers, and shared state. All other functionality (HTTP, caching, auth) lives in separate plugin packages.

Read [README.md](README.md) for the architecture overview and [TERMINOLOGY.md](TERMINOLOGY.md) before touching domain logic - terms like Plugin, Resolver, Provider, Extractor, and ID/Namespace have precise, distinct meanings in this codebase.

## Stack

- TypeScript (strict), Node.js ≥20, ESM-first with dual CJS/ESM build via `tsdown`
- Test runner: Vitest, package manager: npm (`package-lock.json` is the lockfile - don't introduce another one)
- Zero production dependencies by design (see README) - think twice before adding one

## Commands

| Command                | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run build`        | Build with tsdown                                                      |
| `npm run dev`          | Build in watch mode                                                    |
| `npm test`             | Run Vitest suite (**must stay at 100% coverage** - CI fails otherwise) |
| `npm run lint`         | Lint with ESLint (**CI fails on any error**)                           |
| `npm run lint:fix`     | Lint and auto-fix what's safe to fix                                   |
| `npm run format`       | Format with Prettier                                                   |
| `npm run format:check` | Check formatting without writing (**CI fails otherwise**)              |
| `npm run example`      | Run `example/example.ts`                                               |

## Standards docs (don't duplicate here, read these)

- [CONTRIBUTING.md](CONTRIBUTING.md) - dev workflow, commit format, PR process
- [eslint.config.js](eslint.config.js) - lint rules; type-aware, stricter in `src/**` than in `tests/**`
- [.prettierrc](.prettierrc) - formatting rules (no semi, single quotes, printWidth 200, 4-space indent)
- [tsconfig.json](tsconfig.json) - strict compiler options; note `@/*` path alias for `src/*`
- [vitest.config.ts](vitest.config.ts) - coverage thresholds and exclude patterns

## Enforced by CI

`npm run lint`, `npm run format:check`, `npm audit --audit-level=high`, `npm run build`, and `npm test` (100% coverage) all run on every PR - see [.github/workflows/ci.yml](.github/workflows/ci.yml). A PR that fails any of these won't pass CI, so run them locally before pushing.

## Conventions not caught by tooling

Nothing lints these - follow them by hand:

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.) per CONTRIBUTING.md - not enforced by a commit hook.
- Prefer the existing **Result-object pattern** for expected failure paths (return `{ ok, error }`, see the `ERR()` helper in `src/utils/utils.ts`) rather than throwing. Reserve thrown errors for truly exceptional/programmer-error cases.
- **This codebase is functional, not class-based.** Every Registry/Service/util module is a `createX(...)` factory function that closes over local state and returns a plain object literal implementing an `interface X` of the same name - not a class. Private state lives in closure variables (`const`/`let` inside the factory), not `#private` fields, since a closure gives the same encapsulation without a class. Accessor-style properties (`get`/`set`) and self-referencing chainable methods (see `ProviderService.use()`) are implemented as plain object-literal getters/setters and a named `const` the object's own methods close over - see `src/features/hooks/HookRegistry.ts` or `src/features/providers/ProviderResultEmitter.ts` as reference implementations. Two intentional exceptions: `OMSSServer` (the public entry point, kept as `class OMSSServer` with `new OMSSServer(config)` per the README) and the `OMSSError` hierarchy in `src/utils/error.ts` (subclassing the built-in `Error` is the standard JS/TS idiom for custom error types). Plugin/resolver authors implement `OMSSProvider`/`OMSSResolver` as plain objects, optionally through the `defineProvider`/`defineResolver` identity helpers (`src/features/providers/defineProvider.ts`, `src/features/resolvers/defineResolver.ts`) for type inference - there is no `BaseProvider`/`BaseResolver` to `extends`.
- Each `src/features/<name>/` folder follows the existing Registry + Service pairing (as factory functions) and exports its public surface through a `public-api.ts` barrel - follow this shape for new features rather than inventing a new layout.
- **File naming**: a file whose primary export is a factory function (`createX`) is named after its companion `interface X` in PascalCase (e.g. `PluginRegistry.ts` exports `interface PluginRegistry` and `function createPluginRegistry(...)`); a file exporting one of the two class exceptions above follows the same PascalCase-after-the-class rule (e.g. `OMSSServer.ts` exports `class OMSSServer`). A file that groups multiple related exports (types, error classes, free functions) is named for the group in camelCase (e.g. `error.ts`, `utils.ts`, `types/provider.ts`, `defineProvider.ts`). Barrels are always `public-api.ts`.
- Test files live under `tests/` mirroring the `src/` path, named in camelCase regardless of the source file's casing (e.g. `src/core/OMSSServer.ts` → `tests/core/omssServer.test.ts`, `src/features/plugins/PluginService.ts` → `tests/features/plugins/pluginService.test.ts`).
- Import specifiers must include the `.js` extension (NodeNext module resolution) - TypeScript will fail the build otherwise (this one _is_ caught, just by `tsc`/the build rather than lint).
- **JSDoc/TSDoc standard.** This is a public, typedoc-generated API (`typedoc.json`), so every exported `interface`/`type`/`function`/`class`/`enum` and every one of its public members carries a doc comment, structured in this order: a one-line imperative/descriptive summary ending in a period; a blank line then optional extended prose; `@remarks` for caveats; `@typeParam T - Description.` for every generic parameter, in declaration order; `@param name - Description.` for every parameter, in signature order; `@returns Description.` (omitted entirely for `void`-returning members - never write `@returns` on a method that returns nothing); `@example` (fenced ```ts block) on primary public entry points (`OMSSServer`, `defineProvider`, `defineResolver`, `OK`/`ERR`, `parseOMSSId`, service factories); `{@link Name}` for cross-references. Only one non-standard tag exists in this codebase by convention: `@dangerous`, marking an escape hatch that can cause surprising side effects if misused (e.g. `HookRegistry.reset`, `HookService.__getRegistry`) - don't invent others (no `@note`, `@key`/`@value`, `@important`; use `@remarks` prose instead). `@internal` marks exports not meant for consumers (stripped from the published `.d.ts` via `tsconfig.json`'s `stripInternal`). Every sentence - summaries, `@param`/`@returns` text - ends with a period.

## Hard rules

- **Never modify `.env` or `.env.*` files.** Leave environment/secret configuration entirely to the user.
- **Never run git commands that write history or state** (`commit`, `add`, `push`, `checkout`, `reset`, `merge`, `rebase`, `branch -d`, etc.). Read-only inspection (`git log`, `git diff`, `git status`, `gh pr view`, etc.) is fine.
