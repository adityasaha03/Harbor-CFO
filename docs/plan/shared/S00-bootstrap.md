# S00 Monorepo bootstrap and CI

Depends: none. Priority: P0. Read first: AGENTS.md, docs/ARCHITECTURE.md sections 1, 2, 9, 12.

## Goal

A clean pnpm workspace with shared TypeScript, lint, format and CI configuration, so every later chunk drops into a working repo.

## Files to create

- `package.json` (private root, scripts below), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.nvmrc`, `.gitignore`, `.editorconfig`, `.prettierrc`, `.prettierignore`
- `tsconfig.base.json`, `eslint.config.mjs`
- `.github/workflows/ci.yml`
- `README.md` (stub: project name, "see docs/", how to run; completed in S03)
- Empty folders with `.gitkeep`: `apps/api`, `apps/web`, `packages/contracts` (each later chunk creates its own package.json)

## Specification

- Root scripts: `dev` (web and api in parallel), `build`, `lint`, `typecheck`, `test`, `format`. Each delegates with `pnpm -r` or `pnpm --filter`.
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `target ES2022`, `moduleResolution Bundler`, `skipLibCheck`.
- ESLint flat config with `typescript-eslint` (recommended + stylistic): no `any`, no `console`, consistent type imports, import ordering. Add `no-restricted-imports` patterns blocking deep cross-feature imports (`@/features/*/*`; only `@/features/*` is allowed) in both apps.
- CI: checkout, pnpm setup, Node from `.nvmrc`, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`; cache the pnpm store.
- Pin the Node version once (current Active LTS supported by your hosting provider) in `.nvmrc` and `engines`.

## Tasks

- [x] Workspace files and root scripts created, `pnpm install` works
- [x] tsconfig base and ESLint flat config in place; the deep-import rule verified with a deliberate bad import, then removed
- [x] Prettier config and `pnpm format` work
- [x] CI workflow runs on pull requests and passes on the empty repo
- [x] README stub and `.gitignore` (node_modules, .env*, dist, .next, coverage) committed
- [x] Master plan row S00 set to `[x]`
