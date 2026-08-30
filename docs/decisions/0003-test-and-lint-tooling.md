# ADR 0003 — Test and lint tooling

- Status: Accepted
- Date: 2026-08-30
- Milestone: M0–M2 fast track

## Context

M2 prioritizes automated tests for pure logic (state transitions, timer progression, pause behavior, hit idempotency, scoring, combo, integrity, phase selection, vocalist triggering) and AGENTS.md rule 21 requires every milestone to run type checking and all available automated tests, plus lint if configured.

The template shipped **no test runner and no test script**, and although `eslint` was a devDependency there was **no `lint` script** — so "all available checks" was just `tsc --noEmit`. Running eslint manually against the untouched template produced 12 errors, all environmental (`module`/`require`/`__dirname` undefined in CommonJS config files, and `react/prop-types` on the two plain-JS SVG components).

## Decision

**Tests: `node --test` with Node's native TypeScript type stripping.** Node 24.18 runs `.ts` test files directly, so no Jest, ts-jest, babel-jest, or transform configuration is needed — zero new runtime or test-framework dependencies (AGENTS.md rule 18). Only `@types/node` was added as an explicit devDependency; it was already present transitively, and pinning it makes type-checking the test files reproducible.

Consequences of this choice, which M4 must respect:

- test files import project modules **relatively and with an explicit `.ts` extension** (`../game/levels/level01.ts`), because Node's resolver does not read `tsconfig.json` path aliases and does not guess extensions. `allowImportingTsExtensions: true` was added to `tsconfig.json` so `tsc` accepts the same specifiers; `noEmit` is already inherited from `expo/tsconfig.base`, and TypeScript strictness is unchanged (AGENTS.md rule 19);
- tests must stay free of JSX and React Native imports — Node runs them outside Metro. This is a feature, not a limitation: it forces the gameplay logic to be renderer-independent, which is exactly AGENTS.md rule 4. Anything that cannot be tested this way is a signal that domain logic has leaked into a component;
- type stripping erases types but does not transform TypeScript-only runtime constructs, so `enum`, `namespace`, and parameter properties are unavailable in test-reachable code. Use `as const` unions instead — `game/state/gameState.ts` already does.

**Lint: enabled as a gate.** Added `"lint": "eslint . --ext .ts,.tsx,.js"` and fixed the configuration so it passes on the untouched template: `node` env and `no-var-requires` off for `*.config.js`/`.eslintrc.js`, `sourceType: module` for test files, `react.version: detect`, `react/prop-types` off (TypeScript validates props), and explicit ignore patterns for build output.

A `"verify"` script chains all three: `npm run type-check && npm run lint && npm test`.

## Consequences

- Every milestone now has a single reproducible command (`npm run verify`) covering the checks AGENTS.md rule 21 demands.
- If M4 ever needs to test a React component, a real test runner (Jest via `jest-expo`) must be added deliberately as a new ADR. Do not weaken this setup to force component tests through it.
