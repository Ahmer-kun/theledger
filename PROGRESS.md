# Progress — Ledger

Status: **Phase 2 done.** Next up: Phase 3 (ingestion pipeline). Live
signup/login verification needs your Supabase project — infra checklist below.

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

## Phase 2 — Auth & Database — DONE

Auth + schema + RLS foundation implemented and compiling.

- **Auth**: email/password signup + login, Google OAuth, sign-out, and the
  OAuth/email-confirmation callback — `lib/actions/auth.ts`,
  `app/auth/callback/route.ts`. Form validation server-side; messages in the
  product voice; no password handling in app code.
- **Route protection**: `proxy.ts` (Next 16 middleware replacement) — runs on
  every route, refreshes the Supabase session, redirects signed-out users to
  `/login?next=...`, bounces signed-in users off `/login` + `/signup`.
- **Pages**: `/login`, `/signup` with `useActionState` forms + Google button.
- **Schema** (`supabase/migrations/`): pgvector extension; `profiles`
  (id/email/role, trigger-set on signup via SECURITY DEFINER so it can't be
  forged), `receipts` (merchant/date/amount/category/source_type/
  raw_file_url/line_items), `transaction_embeddings` (vector(768),
  content_text, HNSW index).
- **RLS**: enabled on all three tables. owner-scoped policies with
  `WITH CHECK`; `profiles` is SELECT-only from clients (no role escalation);
  explicit grants to `authenticated`; Phase 6 admin extension point
  documented as SQL comments. `SECURITY.md` explains the model for interviews.
- Header is now session-aware (shows email + Sign out vs Log in/Sign up).
- Verified: lint clean, build clean, dev smoke test — `/` 307 → `/login`,
  `/login` and `/signup` render 200. Supabase emits a Node 20 deprecation
  warning (deploy target is Node 22).

### Infra checklist (for live e2e verification / demo)

1. Create a Supabase project; put URL + anon key in `.env.local`.
2. Run the 4 migrations in `supabase/migrations/` (SQL Editor).
3. (Optional Google) Dashboard > Authentication > Providers > Google: add
   Client ID/Secret.
4. Cross-user RLS test, per `SECURITY.md`: two users, confirm A's insert
   is invisible + unwritable by B even via direct Supabase client calls.

## Roadmap

| Phase | File | Status |
|---|---|---|
| 0 | 00-project-brief.md | Done (context) |
| 1 | 01-setup-and-architecture.md | Done |
| 2 | 02-auth-and-database.md | **Done** |
| 3 | 03-ingestion-pipeline.md | Pending |
| 4 | 04-rag-pipeline.md | Pending |
| 5 | 05-dashboard-ui.md | Pending |
| 6 | 06-admin-panel.md | Pending |
| 7 | 07-security-hardening.md | Pending |
| 8 | 08-polish-and-deploy.md | Pending |