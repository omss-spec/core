---
name: feature-module-scaffolder
description: Scaffolds a new src/features/<name>/ module for the @omss/core repo (Registry + Service pair, hook lifecycle, public-api barrel, mirrored tests) in the exact shape every existing feature follows. Use this whenever the user asks to add a new feature, module, subsystem, or capability to OMSS Core's src/features directory, wants a new Registry/Service pair, or says things like "scaffold a new feature", "add a caching feature to core", "create a new src/features folder" — even if they don't use those exact words, infer intent from requests to add a new area of internal core functionality (as opposed to an OMSS *plugin*, which lives in a separate repo entirely and isn't what this skill is for).
---

# Feature Module Scaffolder

## Why this exists

Every subsystem in `src/features/` (`extractors`, `hooks`, `plugins`, `providers`, `resolvers`, `source`) follows the same shape, down to constructor-injection order, error handling, and hook naming. That consistency is what lets any maintainer jump into an unfamiliar feature and immediately know where things live. Adding a new feature by hand from a single example is easy to get 5 of 6 rules right and silently break the 6th — usually the hook triple, the public-api export decision, or the coverage-exclude naming. This skill locks in the whole shape at once instead of copying-and-hoping from whichever existing feature happens to be open.

## Before you start

Read `src/features/plugins/` and `src/features/extractors/` as the two clearest reference implementations — `plugins/` shows the pattern _with_ hooks and a `public-api.ts` barrel, `extractors/` shows it _without_ the barrel. Skim `src/core/OMSSServer.ts` to see how existing features get constructed and wired in, and `src/types/hooks.ts` to see the current `OMSSHooks` map you'll be extending.

## The shape

For a new feature named `<name>` (lowercase, e.g. `cache`) with `<Name>` as its PascalCase form (e.g. `Cache`):

### 1. `src/features/<name>/<Name>Registry.ts` — pure state

Exports `interface <Name>Registry { ... }` (the object shape) and `function create<Name>Registry(...): <Name>Registry` (the factory). The factory holds the actual data structure (a `Map`, array, etc.) for this feature in local closure variables (`const`/`let`) — no knowledge of hooks or the server — and returns an object literal implementing the interface. Public methods return plain values or booleans, not `Result` — the _Service_ layer is what wraps things in `Result`/hooks. State lives in the closure, not `#private` fields — there's no class. The factory only takes what it needs to hold that state (often nothing at all, or the `OMSSServer` if the registry needs to call back into it — see `PluginRegistry`).

### 2. `src/features/<name>/<Name>Service.ts` — the public-facing surface

Exports `interface <Name>Service { ... }` and `function create<Name>Service(registry: <Name>Registry, hookRegistry: HookRegistry<OMSSHooks>): <Name>Service`, matching the parameter order every existing service uses. It wraps registry calls, fires the before/after/failed hook triple (below), and returns `Result<T, OMSSError>` via `OK()`/`ERR()` from `@/utils/utils.js` for anything that can fail in an expected way. Never `throw` for expected failures — only for genuine programmer errors. If a method needs to return itself for chaining (like `ProviderService.use()`), give the returned object literal a name (`const service = {...}`) and have that method return `service`.

### 3. The hook triple, in `src/types/hooks.ts`

For each mutating operation this feature performs, add exactly three entries to the `OMSSHooks` type, following the existing naming exactly:

- `before<Action>: (payload: {...}) => void | Promise<void>` — fired before the operation
- `after<Action>: (payload: {...}) => void | Promise<void>` — fired after it succeeds
- `<action>Failed: (payload: {...; error: <SomeOMSSError>}) => void | Promise<void>` — fired on failure; payload is the `before` payload plus `error`

`beforeRegisterExtractor` / `afterRegisterExtractor` / `extractorRegisterFailed` is the cleanest existing example to copy the shape from.

### 4. `src/features/<name>/public-api.ts` — only if the feature needs one

**Not every feature has one.** Check `src/public-api.ts` first: only `hooks`, `plugins`, `providers`, and `resolvers` currently have their own `public-api.ts` — `extractors` and `source` don't. The rule: add a `public-api.ts` barrel _only_ if this feature exports a runtime value meant for external consumers — typically a `defineX`-style identity helper plugin authors call (see `defineProvider`/`defineResolver`), or a helper function (like `parseOMSSId`). If the feature only exposes _types_ (already covered by `export type * from '@/types/<name>.js'`) and its Registry/Service are purely internal (reached only through `OMSSServer`'s own properties), skip the barrel entirely.

If you do add one, wire it into `src/public-api.ts`'s "Export public utilities" block alongside the others.

### 5. Wire it into `src/core/OMSSServer.ts`

Add the new registry + service construction inside the constructor, in the same order/style as the existing ones: instantiate the registry, then the service (passing the registry and the shared `hooksRegistry`), then expose the service as a `readonly` property on `OMSSServer`.

### 6. `src/types/<name>.ts` — if the feature needs its own types

Lowercase filename (it's a types-grouping file, like `types/provider.ts`). Add `export type * from '@/types/<name>.js'` to the "Export types" block of `src/public-api.ts`.

### 7. Tests

Mirror `src/features/<name>/` under `tests/features/<name>/`, one `.test.ts` per class, camelCase filenames regardless of the source file's PascalCase — lowercase only the first letter (`<Name>Registry.ts` → `<name>Registry.test.ts`). Check whether `tests/utils.ts` needs a new `create<Name>...()` factory alongside the existing ones (`createProviderService`, `createSourceCore`, etc.) — if other test files will construct this feature repeatedly, add a shared factory there instead of duplicating setup per test file.

Coverage is enforced at **100%** (`vitest.config.ts` thresholds). The exclude list only covers `src/types/**`, `src/index.ts`, and `src/**/public-api.ts` — your new Registry/Service files must be fully covered, including every error branch. Consider handing this step to the `coverage-complete-test-writer` skill.

## Naming and style rules (apply to every file you create)

- Factory/interface files: PascalCase filename matching the interface exactly (`<Name>Registry.ts` exports `interface <Name>Registry` + `function create<Name>Registry(...)`).
- No classes and no `#private`/`private` fields for this pattern — state lives in `const`/`let` closure variables inside the factory function. (The only class exceptions in this codebase are `OMSSServer` and the `OMSSError` hierarchy — a new feature module is neither.)
- Every local import ends in `.js` (NodeNext resolution) even though the file is `.ts`.
- JSDoc on every exported interface, its methods, and every exported function — look at the existing files for tone (short, imperative, `@param`/`@returns` where they add information beyond the signature).
- Return `Result<T, E>` (`OK()`/`ERR()`) for expected failures; only `throw` for programmer errors.

## After scaffolding

Run, in order, and fix anything that fails before considering the work done:

```
npm run lint
npx tsc --noEmit -p tsconfig.json
npm test
npm run build
```
