# AGENTS.md — rules for every AI coding agent on HarborCFO

HarborCFO is an SME finance copilot built for the 2026 Shenzhen International FinTech Competition (Topic E).
Deadline: Oct 20, 2026, 23:59 Beijing time (21:59 Dhaka). Five humans work in parallel, each with an AI agent.
Quality, security and consistency matter more than typing speed. Do the work properly, once.

## 1. Read order (every session, before writing any code)

1. `docs/IMPLEMENTATION_PLAN.md`: what is done, claimed, or next.
2. `docs/ARCHITECTURE.md`: conventions you must follow.
3. `docs/DB_SCHEMA.md`: every collection and how they relate.
4. `docs/PRODUCT_BRIEF.md`: product rules, roles, anchor numbers.
5. `docs/API_REFERENCE.md`: every endpoint, permission and event kind.
6. Your assigned chunk file in `docs/plan/<shared|backend|frontend>/`.

Do not start coding until you have read all six. If something you need is not written down, ask the human; do not guess.

## 2. Stack (fixed, do not substitute)

Next.js (App Router, TypeScript) + Express (TypeScript) + Better Auth + MongoDB (Mongoose on the API side).
pnpm workspaces: `apps/web`, `apps/api`, `packages/contracts`.

## 3. Non-negotiable engineering rules

1. **Feature-based architecture** in both apps. Every feature is one folder that owns all of its files. Never create global `controllers/`, `services/`, `models/`, `components/` dumping grounds. Details in `docs/ARCHITECTURE.md`.
2. **One responsibility per file.** Target under 200 lines, hard limit 300. Split before you exceed it.
3. **TypeScript strict.** No `any`, no `@ts-ignore` without a one-line reason, no unchecked `as` casts on external data. Validate every external input with Zod.
4. **Better Auth API rule.** Better Auth changes often. Before writing any Better Auth code (server config, client, plugins, adapter), read the current docs at https://better-auth.com/docs for that plugin. Never write Better Auth calls from memory. If the docs differ from this plan, follow the docs and log the deviation (section 6).
5. **Security invariants** (a violation blocks merge):
   - The Express API is the only authority. Hiding a button in React is UX, not protection.
   - Every database query on tenant-owned data includes `tenantId` in the query itself. Repositories take `tenantId` as the first argument.
   - `tenantId`, `userId` and `role` come from the verified token and the membership lookup, never from request bodies or LLM output.
   - The LLM never computes numbers, never runs database code, never approves or executes money actions.
   - Imported text (invoice descriptions, CSV cells) is untrusted data. Never put it into instructions, queries, or HTML.
   - No secrets in the repo. Only names in `.env.example`.
6. **Money** is an integer count of minor units (fen) everywhere. Never use floats for money. See `docs/ARCHITECTURE.md` section 7.
7. **Tests are part of the task.** A chunk is not done until its tests exist and pass, plus `pnpm typecheck` and `pnpm lint`.
8. **Synthetic data only.** Label demo data as synthetic in the UI.

## 4. Working on a chunk (the loop)

1. `git pull` the latest `main`. Re-read `docs/IMPLEMENTATION_PLAN.md`.
2. Pick your chunk (assigned by the human, or the first chunk whose dependencies are all `[x]` and which is unclaimed `[ ]`).
3. **Claim it**: change only that chunk's row in the master plan to `[~] @handle`, commit `chore(plan): claim <ID>`, push. Do this before coding.
4. Branch: `feat/<ID>-<short-slug>` (example `feat/B08-forecast-engine`).
5. Implement the chunk in the order written. After each task, tick its checkbox in the chunk file (`- [x]`) and commit.
6. If you must deviate from the plan, append one line to the Deviation Log at the bottom of `docs/IMPLEMENTATION_PLAN.md` (what, why, impact).
7. If you add or change a collection or field, update `docs/DB_SCHEMA.md` in the same commit. If you add or change an endpoint, update `docs/API_REFERENCE.md`.
8. If you add a shared type, schema, enum or permission, put it in `packages/contracts/src/<feature>.ts` (one file per feature to avoid merge conflicts).
9. Finish: run `pnpm typecheck && pnpm lint && pnpm test`, tick every checkbox, set the master row to `[x] @handle`, open a PR titled `<ID>: <title>`.
10. Report to the human: what was built, files touched, tests run, deviations, open questions.

## 5. Sync rules for parallel work

- One chunk = one owner = one branch = one PR. Never edit files that belong to another chunk. Allowed shared edits: one line in `apps/api/src/routes.ts` for your feature router, your feature's file in `packages/contracts`, your sections of `docs/DB_SCHEMA.md`, your own row in the master plan.
- If your chunk needs something from an unfinished chunk, stop, tell the human, and either work on another unblocked chunk or use a clearly marked temporary stub in your own feature folder.
- Pull `main` at least every two hours and before opening a PR. Resolve conflicts, never overwrite a teammate's work.
- Commit small, use Conventional Commits (`feat(forecast): ...`, `test(auth): ...`, `docs(schema): ...`).
- Never rewrite history on shared branches. Never commit `.env`.

## 6. Deviation log and questions

- Deviations go in the Deviation Log (bottom of `docs/IMPLEMENTATION_PLAN.md`), append-only, one line each.
- Anything ambiguous or with security impact: ask the human before implementing.

## 7. Never do this

- Do not add libraries not listed in `docs/ARCHITECTURE.md` section 1 without asking.
- Do not build features outside the plan (OCR, mobile app, multi-currency, extra agents).
- Do not mark a task done without running it.
- Do not claim a write succeeded without a persisted record.
- Do not weaken a security rule to make a test pass; fix the cause.
