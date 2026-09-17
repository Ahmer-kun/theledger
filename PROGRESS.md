# Progress — Ledger

Status: **Phase 3 built (live DoD verification pending).** The ingestion
pipeline is implemented and migration `0006` is applied + verified live.
Remaining: add a Gemini key to `.env.local` and run the DoD checks (3+ real
receipts, a real CSV, a bad/blurry file).

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
2. Run the migrations in `supabase/migrations/` (SQL Editor).
3. (Optional Google) Dashboard > Authentication > Providers > Google: add
   Client ID/Secret.
4. Cross-user RLS test, per `SECURITY.md`: two users, confirm A's insert
   is invisible + unwritable by B even via direct Supabase client calls.

### Live verification — DONE (2026-09-15)

- All 5 migrations applied to the live project:
  `0001` pgvector, `0002` profiles + signup trigger, `0003` receipts,
  `0004` transaction_embeddings + HNSW,
  `0005` grant hardening (revokes Supabase default full-DML grants on
  `profiles`; anon DML + TRUNCATE on tenant tables).
- Schema confirmed: RLS on all three tables; policies `profiles: own read`,
  `receipts` + `transaction_embeddings: own full`; `vector` extension;
  `on_auth_user_created` trigger.
- Grants after hardening: `profiles` = SELECT-only (anon + authenticated);
  `receipts`/`transaction_embeddings` = authenticated DML, no anon, no TRUNCATE.
- Cross-user RLS test ran against live auth + tables (11/11 PASS): profile
  auto-created on signup with role `user`; A cannot read/update/delete B's
  receipts, cannot forge a receipt owned by B, cannot self-promote to admin;
  B cannot read A's profile. Test users cleaned up afterwards.
- Migrations were applied with a throwaway `pg` runner (not committed);
  `pg`/`ws` devDependencies removed after use.

## Phase 3 — Ingestion Pipeline — DONE (build) / live DoD pending

Upload → extract → review → save pipeline for receipts and bank statements.

- **Upload** (`components/upload-panel.tsx`, `app/page.tsx`): drag-and-drop
  or picker for images/CSV/PDF; client + server validation of type/size
  (8 MB cap) with clear messages; files land in Supabase Storage under
  `user-files/{userId}/{uuid}/{file}` via the user's server session.
- **Server actions** (`lib/actions/ingest.ts`): `uploadFile`,
  `extractFromStored`, `saveExtractions`.
- **Extraction** (`lib/gemini.ts`): Gemini 2.5 Flash (vision) with strict
  JSON `responseSchema` for receipts and PDFs; Zod validation of the model
  reply. Low-confidence or unparseable receipts become an **editable review
  draft** — never a silent/confident wrong save. CSV rows parsed directly
  (no LLM) with header auto-detection and per-row error reporting.
- **Categories**: fixed list in `types/index.ts`; assigned by extraction,
  override-able in the review UI.
- **Review UI**: editable merchant/date/amount/category per row, line items
  shown read-only, skipped-row warnings, explicit uploading / reading /
  review / saved states (no spinner-with-no-explanation).
- **Embeddings hand-off** (`lib/embeddings.ts`): `buildContentText` turns a
  receipt row into a natural-language string for Phase 4.
- **Config**: `serverActions.bodySizeLimit` and
  `proxyClientMaxBodySize` both `10mb` (Next 16 defaults truncate uploads).
- **Migration `0006`**: private `user-files` bucket + 4 storage RLS policies
  scoped to each user's folder, and `receipts.status` (`saved`/`needs_review`).
- Verified: lint clean, build clean, dev smoke test (`/` 307 → `/login`,
  `/login` + `/signup` 200), migration `0006` applied + verified live
  (bucket private, 4 policies, status column + check constraint), and 11/11
  parser/content-text sanity checks (chase-style CSV, debit/credit columns,
  garbage CSV, bad rows, content text).

### Live DoD checklist (needs GEMINI_API_KEY in `.env.local`)

1. Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) to `.env.local`.
2. Sign in, then upload 3+ real receipts of different formats — each must
   produce a correctly structured saved transaction.
3. Upload a real CSV statement — must parse multiple rows, category-editable.
4. Upload a deliberately bad/blurry photo — must produce a reviewable draft,
   not a crash or a confident wrong save.

## Roadmap

| Phase | File | Status |
|---|---|---|
| 0 | 00-project-brief.md | Done (context) |
| 1 | 01-setup-and-architecture.md | Done |
| 2 | 02-auth-and-database.md | **Done** |
| 3 | 03-ingestion-pipeline.md | **Done** (live DoD pending) |
| 4 | 04-rag-pipeline.md | Pending |
| 5 | 05-dashboard-ui.md | Pending |
| 6 | 06-admin-panel.md | Pending |
| 7 | 07-security-hardening.md | Pending |
| 8 | 08-polish-and-deploy.md | Pending |