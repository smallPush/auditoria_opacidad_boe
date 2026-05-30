# Agent Notes

## Commands
- Install/build with npm: CI uses Node 22, `npm ci`, `npm run sitemap`, then `npm run build`.
- Dev server: `npm run dev` starts Vite on port 3000 and host `0.0.0.0`.
- Tests are Bun tests, not npm scripts: run all with `bun test`; run one file with `bun test components/Pagination.test.tsx`.
- `npm run audit -- --offset 0 --limit 1` runs the BOE auditor; add `--date YYYYMMDD` for a fixed BOE date.

## Architecture
- This is a flat Vite React app, not a `src/` layout. Entrypoints are `index.tsx` and `App.tsx`; imports use the `@/*` alias mapped to the repo root.
- Routing uses `HashRouter`, and production Vite `base` is `./` for GitHub Pages compatibility.
- Bundled audit history comes from `audited_reports/Audit_*.json` and `audited_reports/BOE_Audit_Index_*.json` via `import.meta.glob` in `services/supabaseService.ts`.
- Local/remote history merge order is remote Supabase > bundled `audited_reports` > browser `localStorage`.

## Environment And Side Effects
- Browser Gemini calls intentionally require a user-provided API key; `services/geminiService.ts` does not fall back to `VITE_GEMINI_API_KEY` to avoid exposing server keys.
- The CLI auditor loads secrets from `.env` specifically, not `.env.local`; it exits if `GEMINI_API_KEY` is missing.
- `scripts/audit-latest.js` can call Gemini, write new files under `audited_reports/`, update the index file, shorten URLs, and attempt to post tweets.
- `scripts/twitter-client.js` may rewrite `.env` with refreshed Twitter tokens; do not run tweet/audit flows casually.
- In Vite dev only, `vite.config.ts` provides `/api/save-audit` and `/api/post-tweet` bridge endpoints guarded by `VITE_BRIDGE_SECRET` or the dev fallback secret.

## Generated Data And Deploy
- `npm run sitemap` writes `public/sitemap.xml` from `audited_reports`; deploy runs it before building.
- Scheduled GitHub workflows split audits by offset (`audit_00.yml` through `audit_19.yml`), commit only `audited_reports/`, then deploy on successful audit workflow completion.
- Auto releases are tag-driven: `.github/workflows/auto-tag-release.yml` bumps the next patch tag after `Scheduled BOE Audit 19` succeeds on `main`/`master`.

## Verification
- Verified locally: `bun test` passes; `npm run build` passes with Vite's existing large chunk warning.
- There is no ESLint, Prettier, or typecheck script in `package.json`; use the build and targeted Bun tests as the main local checks.
