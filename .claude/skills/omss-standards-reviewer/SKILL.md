---
name: omss-standards-reviewer
description: Reviews a diff, PR, or set of changed files in the @omss/core repo against this repo's own specific coding conventions - the ones a generic code review would miss because they're not enforced by ESLint, Prettier, or tsc. Use this whenever the user asks to review code, review a PR, check a diff before merging, or check whether changes "follow our conventions" / "match the existing style" in this repo. Use it *in addition to*, not instead of, a general correctness/security review (use the code-review skill for that) - this one is a repo-specific supplementary pass, and is most valuable run right before merge.
---

# OMSS Standards Reviewer

## Why this exists

This repo enforces a lot mechanically now: ESLint, Prettier, `tsc --strict`, and 100% test coverage all run in CI (see AGENTS.md's "Enforced by CI" section). But several real conventions still live only in the existing code and in AGENTS.md's "Conventions not caught by tooling" - nothing will flag a violation of them automatically. This skill is that missing check, and it exists because it's easy for even a careful change to satisfy the linter while still drifting from how this codebase actually works.

## What to check

Go through the changed files against the list below. For each finding, cite the file and line, and explain _why_ it's wrong by pointing at the existing convention or a specific file that follows it correctly - not just that it differs from some abstract rule.

### 1. Result-object pattern, not throwing, for expected failures

Look for `throw` in changed `src/**` files. It should only appear for genuinely exceptional/programmer-error situations (see `PluginRegistry.add`'s `catch` block, which _catches_ a plugin's throw and converts it into `ERR(...)` rather than letting it propagate). Any new function that can fail in an expected way - validation failure, not-found, etc. - should return `Result<T, E>` via `OK()`/`ERR()` from `@/utils/utils.js`, matching every existing Service method.

### 2. Closures, not classes - no `#private`/`private` fields

This repo is functional: every Registry/Service/util module is a `createX(...)` factory returning a plain object literal that implements an `interface X` of the same name, with internal state kept in closure-scoped `const`/`let` variables - not a class, and not `#private`/`private` fields (any existing `Registry`/`Service` file is a reference). The only two classes in the codebase are `OMSSServer` and the `OMSSError` hierarchy in `src/utils/error.ts` - flag any _new_ `class` outside those two, and flag any `private`/`#private` field usage (there's no class to attach it to).

### 3. `.js` import extensions

Every relative/aliased import of a local `.ts` file must end in `.js` (NodeNext module resolution). This would actually fail the build via `tsc`, but catching it in review saves a round trip.

### 4. File naming

- A file whose primary export is a factory function: PascalCase filename matching its companion interface exactly (`PluginRegistry.ts` exports `interface PluginRegistry` + `function createPluginRegistry(...)`). The same rule applies to the two class exceptions (`OMSSServer.ts` exports `class OMSSServer`).
- A file that groups multiple related exports (types, error classes, free functions): camelCase, named for the group rather than any single export (`error.ts`, `utils.ts`, `types/provider.ts`, `defineProvider.ts`).
- Barrels are always literally named `public-api.ts`.
- Test files mirror the `src/` path under `tests/`, always camelCase regardless of the source file's casing (`OMSSServer.ts` → `tests/core/omssServer.test.ts`).

Flag any new file that doesn't fit one of the first two buckets.

### 5. JSDoc/TSDoc standard

Every exported `interface`/`type`/`function`/`class`/`enum` and its public members should carry a doc comment following AGENTS.md's standard: one-line imperative/descriptive summary ending in a period, `@typeParam` for every generic (in declaration order), `@param name - Description.` for every parameter (in signature order), `@returns Description.` (never on a `void`-returning member), `@example` on primary public entry points. Flag any ad-hoc tag that isn't `@remarks`/`@see`/`@internal`/`@dangerous` (this repo's one deliberate custom tag, for footguns) - things like `@note`, `@key`/`@value`, or `@important` should be prose under `@remarks` instead. Use `PluginService.ts` or `ExtractorService.ts` as the tone reference.

### 6. `public-api.ts` barrel wiring

If a change adds a new runtime export meant for external consumers - a `defineX`-style helper plugin authors would call, a helper function - check whether it needs to be added to its feature's `public-api.ts`. Only `hooks`, `plugins`, `providers`, and `resolvers` currently have one (see `src/public-api.ts` for which features are wired in); `extractors` and `source` intentionally don't. If it's a new type, confirm `src/public-api.ts`'s `export type *` block covers its file. A new public class that's unreachable from the package's actual entrypoint is a real bug, not a style nit.

### 7. Hook lifecycle triple

If a change adds a new mutating operation, check `src/types/hooks.ts` for a matching `before<X>` / `after<X>` / `<x>Failed` triple, named and shaped like the existing ones (`<x>Failed`'s payload = the `before` payload plus `error`).

### 8. Conventional Commits on the PR title/description

Check the PR title (or, for a local diff, ask what the commit/PR title will be) against `<type>(<scope>): <summary>` with `type` in `feat|fix|docs|style|refactor|test|chore|ci`, per CONTRIBUTING.md. Nothing in this repo enforces this with a hook.

### 9. Test coverage

This repo enforces **100%** coverage as a hard CI gate, not a target. If the diff adds any branch, error path, or new file not covered by `vitest.config.ts`'s exclude list (`src/types/**`, `src/index.ts`, `src/**/public-api.ts`), check there's a test exercising it - actually reason about whether every new branch has a corresponding assertion, don't just trust that `npm test` was run. Hand off to the `coverage-complete-test-writer` skill for actually writing anything missing.

## What NOT to flag

Don't re-flag anything ESLint, Prettier, or `tsc` would already catch - missing `await`, `any` usage, non-null assertions, formatting, unused imports. That's already enforced by `npm run lint` / `npm run format:check` / the build, and repeating it here is noise. This skill exists specifically for the gap tooling doesn't cover.

## Output format

Group findings by the numbered category above, each with `file:line` and a one-line fix. If a diff is clean on every point, say so explicitly - "no standards violations found" is a complete, useful review outcome, not a non-answer.
