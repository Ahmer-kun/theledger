# Progress — Ledger

Status: **Phase 1 complete.** Next up: Phase 2 (auth + database).

## Phase 1 — Setup & Architecture — DONE

Scaffolded the repo and locked in the stack so later phases don't drift.

- Next.js 16.3.5 (App Router) + TypeScript + Tailwind CSS v4, no `src/` dir.
- Streams: `/app` (routes only), `/components` (shared UI), `/lib` (supabase
  clients, embeddings + LLM helpers as stubs), `/types` (domain types).
- `.env.local.example` lists every env var (Supabase URL/keys, Gemini, Groq);
  `.env*` gitignored with `.env.local.example` force-tracked.
- Supabase browser client (`lib/supabase.ts`) + server client
  (`lib/supabase-server.ts`, cookie-aware, async `cookies()` for Next 16).
- App shell: top nav (serif wordmark, accent mark, Log in / Sign up
  placeholders) + restrained empty home page. Design plan recorded in the
  session and applied via tokens in `app/globals.css` (`@theme`).
- README with setup instructions and architecture-diagram placeholder.
- `prompts/` build kit restored to repo root; AGENTS.md + PROGRESS.md added.

Verified: `npm run lint` and `npm run build` both clean; `npm run dev` serves
the shell at :3000.

## Roadmap

| Phase | File | Status |
|---|---|---|
| 0 | 00-project-brief.md | Done (context) |
| 1 | 01-setup-and-architecture.md | **Done** |
| 2 | 02-auth-and-database.md | Pending |
| 3 | 03-ingestion-pipeline.md | Pending |
| 4 | 04-rag-pipeline.md | Pending |
| 5 | 05-dashboard-ui.md | Pending |
| 6 | 06-admin-panel.md | Pending |
| 7 | 07-security-hardening.md | Pending |
| 8 | 08-polish-and-deploy.md | Pending |