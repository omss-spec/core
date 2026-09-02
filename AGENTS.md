# AGENTS.md

## Project

**@omss/core** — the official TypeScript runtime and plugin orchestrator for [OMSS](https://github.com/omss-spec/omss-spec)-compliant media streaming services. Intentionally minimal: manages plugin lifecycle, hooks, resolvers, providers, and shared state. All other functionality (HTTP, caching, auth) lives in separate plugin packages.

Read [README.md](README.md) for the architecture overview and [TERMINOLOGY.md](TERMINOLOGY.md) before touching domain logic — terms like Plugin, Resolver, Provider, Extractor, and ID/Namespace have precise, distinct meanings in this codebase.

## Stack

- TypeScript (strict), Node.js ≥20, ESM-first with dual CJS/ESM build via `tsdown`
- Test runner: Vitest, package manager: npm (`package-lock.json` is the lockfile — don't introduce another one)
- Zero production dependencies by design (see README) — think twice before adding one

## Commands

| Command | Purpose |
|---|---|
| `npm run build` | Build with tsdown |
| `npm run dev` | Build in watch mode |
| `npm test` | Run Vitest suite (**must stay at 100% coverage** — CI fails otherwise) |
| `npm run format` | Format with Prettier (not run in CI — see below) |
| `npm run example` | Run `example/example.ts` |

## Standards docs (don't duplicate here, read these)

- [CONTRIBUTING.md](CONTRIBUTING.md) — dev workflow, commit format, PR process
- [.prettierrc](.prettierrc) — formatting rules (no semi, single quotes, printWidth 200, 4-space indent)
- [tsconfig.json](tsconfig.json) — strict compiler options; note `@/*` path alias for `src/*`
- [vitest.config.ts](vitest.config.ts) — coverage thresholds and exclude patterns

## Conventions not caught by tooling

CI runs `npm audit`, build, and tests-with-coverage — **there is no lint step and Prettier is never checked in CI**, despite the CI job's name. Follow these by hand since nothing will flag a violation:

- Match `.prettierrc` formatting (no semicolons, single quotes, 4-space indent) even though CI won't check it.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.) per CONTRIBUTING.md.
- New code must keep coverage at 100% (`npm test` enforces this locally) — add tests alongside any source change.
- Prefer the existing **Result-object pattern** for expected failure paths (return `{ ok, error }`, see the `ERR()` helper in `src/utils/utils.ts`) rather than throwing. Reserve thrown errors for truly exceptional/programmer-error cases.
- Use native `#private` class fields, not TypeScript's `private` keyword.
- Each `src/features/<name>/` folder follows the existing Registry + Service pairing and exports its public surface through a `public-api.ts` barrel — follow this shape for new features rather than inventing a new layout.
- Import specifiers must include the `.js` extension (NodeNext module resolution) — TypeScript will fail the build otherwise.
- Test files live under `tests/` mirroring the `src/` path, named in camelCase matching the vitest `include` glob (e.g. `src/features/plugins/PluginService.ts` → `tests/features/plugins/pluginService.test.ts`).

## Hard rules

- **Never modify `.env` or `.env.*` files.** Leave environment/secret configuration entirely to the user.
- **Never run git commands that write history or state** (`commit`, `add`, `push`, `checkout`, `reset`, `merge`, `rebase`, `branch -d`, etc.). Read-only inspection (`git log`, `git diff`, `git status`, `gh pr view`, etc.) is fine.