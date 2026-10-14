# S03 Deployment, README and release packaging

Depends: all P0 chunks. Priority: P0. Read first: PRODUCT_BRIEF.md deliverables; ARCHITECTURE.md section 11.

## Goal

A reviewer can open the hosted demo and can also run everything from a clean clone. The submission package is complete and consistent.

## Tasks

- [ ] **Hosting**: web on Vercel (or any Node host), API on a Node host (Render, Railway or Fly), database on MongoDB Atlas (replica set, so transactions work). Set every variable from ARCHITECTURE.md section 11 in each service. `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` = the public web URL; `WEB_ORIGIN` on the API = the same URL; `NEXT_PUBLIC_API_URL` = the public API URL.
- [ ] **Atlas**: dedicated database user with least privilege on the `harbor` database, network access restricted where the host allows, TLS on.
- [ ] Health check: `GET /health/ready` on the API passes in production; CORS test from the hosted web app works.
- [ ] Run seeds against production: `seed:auth` (web) then `seed:demo` (api, chunk B17). Verify the three Harbor roles can sign in.
- [ ] **README.md** (root) complete: what it is, architecture picture or link, prerequisites, exact Node/pnpm versions, install, env setup, local MongoDB replica set command, seed, dev, test commands, deployment steps, demo accounts (emails only; password shared in the submission form or documented as demo-only), live vs replay agent mode, limitations.
- [ ] Local MongoDB: a `docker-compose.yml` (or script) that starts a single-node replica set and initializes it; documented.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck` pass from a clean clone, run by someone who did not write the setup.
- [ ] Evidence export (chunk B17) run against the release build; files committed under `submissions/execution-evidence/` with `manifest.json` checksums.
- [ ] License inventory file (`THIRD_PARTY_LICENSES.md`) generated from dependencies; secret scan and dependency audit results saved under `submissions/security/`.
- [ ] Git tag `v1.0.0-submission`, commit hash recorded in README and in the evidence metadata.
- [ ] Final package folder `submissions/`: technical document, security self-assessment, deck, video (under 5 min), evidence bundle, manifest. Cross-check that numbers match across all of them.
- [ ] Master plan row S03 set to `[x]`
