---
name: coverage-complete-test-writer
description: Writes or extends Vitest tests for a source change in the @omss/core repo, using the repo's existing shared test factories, and verifies the result against the hard 100% coverage gate before calling the work done. Use this whenever the user asks to add tests, write tests, "make sure this is covered", fix a coverage gap, or after making any change to files under src/ in this repo - coverage here is a hard CI gate, not an aspiration, so a source change isn't actually finished until this has run.
---

# Coverage-Complete Test Writer

## Why this exists

`vitest.config.ts` sets `lines`/`functions`/`branches`/`statements` thresholds to **100%**, and CI runs `npm test` specifically to fail the build if coverage drops at all (see `.github/workflows/ci.yml`'s "Run tests but fail if coverage is below 100%" step). This isn't "aim for high coverage" - a single new branch or line without a test breaks the build. It's also easy to miss: a one-line change deep inside a callback can silently drop coverage in a way that's invisible unless you actually run the coverage report afterward and read it. Don't skip the last step of this skill.

## Workflow

### 1. Look for an existing shared factory first

Before writing setup code, check `tests/utils.ts` for a factory that already builds what you need:

- `createServer(config?)` - a bare `OMSSServer`
- `createProvider(resolver?, getSources?, overrides?)` / `createResolver(response?, resolve?, overrides?)` - plain objects implementing `OMSSProvider`/`OMSSResolver`, with sensible defaults so you only override what the test actually cares about
- `createExtractor(matches?)` - a test `Extractor` with `vi.fn()` matcher/parse
- `createProviderService()`, `createSourceCore()`, `createSourceService()`, `createProviderEmitter(hookRegistry?)`, `createRunner<T>()`, `createAsyncDeduper<T, V>()` - pre-wired feature instances with their registries/hook registries already constructed correctly

Reuse these rather than calling `createXRegistry()` / `createXService()` by hand in each test - that's exactly what they exist to avoid, and it's how every existing test file is written. If the change you're testing needs a _new_ recurring setup shape (e.g. a brand-new feature module), add a factory to `tests/utils.ts` alongside the existing ones instead of duplicating it per test file.

### 2. Place the test at the mirrored path

`tests/` mirrors `src/`'s directory structure exactly, one `.test.ts` per class/module, filename camelCased regardless of the source file's casing:

- `src/core/OMSSServer.ts` → `tests/core/omssServer.test.ts`
- `src/features/plugins/PluginService.ts` → `tests/features/plugins/pluginService.test.ts`
- `src/utils/MiddlewareRunner.ts` → `tests/utils/middlewareRunner.test.ts`

Extend the existing file for that source module if one exists; only create a new one if the source module itself is new.

### 3. Write tests that hit every branch, not just the happy path

For every `if` / `?:` / early-return / `catch` your change touches, write (or confirm there's already) a test that exercises it. Pay particular attention to:

- Error paths that return `ERR(...)` - not just the `OK(...)` path
- Any new hook (`before<X>` / `after<X>` / `<x>Failed`) - at minimum, confirm it fires with the right payload
- Callbacks/closures passed to something else (arrow functions, `.map()` callbacks) - these are easy to leave uncovered because the outer function looks tested even when an inner branch isn't

Match the existing test style: `describe`/`it` from Vitest, `expect(result.ok).toBe(true/false)` for `Result` values, and `await` every promise-returning assertion - `expect(promise).rejects.toThrow(...)` needs `await` in front of the _whole_ `expect(...)` expression, because a missing `await` there means the assertion may never actually run before the test finishes. That's a real bug this project has hit in practice, not a style nit.

### 4. Know what's intentionally excluded

Don't chase coverage on: `src/types/**` (type-only), `src/index.ts` (re-export shim), `src/**/public-api.ts` (barrels). These are excluded in `vitest.config.ts` on purpose - don't add tests just to "cover" them, and don't be alarmed if they show as uncovered in isolation. Everything else, including `defineProvider.ts`/`defineResolver.ts`, is a normal source file and needs real coverage.

### 5. Verify against the actual gate - don't assume

Run:

```
npm test
```

and read the coverage summary table it prints. Confirm all four numbers (Statements/Branches/Functions/Lines) read **100%** - if any file appears in the "Uncovered Line #s" column, the work isn't done; add a test for that exact line/branch and rerun. Don't rely on "the tests I wrote look reasonable" as a stopping point - this project's coverage gate has caught real gaps from changes that looked complete at a glance (a single bound-method fix once needed a whole new test to get back to 100%, because the fix itself added a line nothing exercised). Treat the coverage report as the actual acceptance criterion, not a formality to skim past.

### 6. Sanity-check the rest of the pipeline

Once coverage is clean, also run `npm run lint` and `npx tsc --noEmit -p tsconfig.json` on the test file(s) you touched - test files are linted too, with a slightly relaxed rule set for things like `require-await` on mock implementations (see `eslint.config.js`'s `tests/**/*.ts` override, and don't be surprised that `no-explicit-any`/`no-unsafe-*`/`only-throw-error` are off there - mocking loosely-typed data and throwing non-Error values on purpose to test error handling are both normal in this repo's tests).
