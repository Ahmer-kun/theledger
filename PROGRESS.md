# Progress — Ledger

Status: **Phase 6 done — live-verified.** Admin panel gated by `profiles.role`
(server-side route + query level), aggregate-only, authenticated user blocked
on `/admin` and on the `admin_stats()` RPC directly. Next up: Phase 7
(security hardening).

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

## Phase 3 — Ingestion Pipeline — DONE (live-verified)

Upload → extract → review → save pipeline for receipts and bank statements.

- **Upload** (`components/upload-panel.tsx`, `app/page.tsx`): drag-and-drop
  or picker for images/CSV/PDF; client + server validation of type/size
  (8 MB cap) with clear messages; files land in Supabase Storage under
  `user-files/{userId}/{uuid}/{file}` via the user's server session.
- **Server actions** (`lib/actions/ingest.ts`): `uploadFile`,
  `extractFromStored`, `saveExtractions`.
- **Extraction** (`lib/gemini.ts`): Gemini **3.6 Flash** (vision) with strict
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

### Live DoD — PASSED (`2026`)

Ran with generated mock files (dot-matrix rendered receipt PNGs, a
Chase-style CSV, and a seeded blurry "bad" photo) through the real storage,
Gemini extraction, and save paths as a throwaway user (cleaned up after).

- **3 receipts → high-confidence, complete, matched expected merchants:**
  BLUEBOTTLE COFFEE ($7.75, 2026-08-14), TRADER JOE'S ($16.40, 2026-08-16),
  SHELL FUEL STOP ($45.42, 2026-08-10); line items and categories surfaced;
  saved with `status='saved'`.
- **Bad photo** (seeded noise, blurred): no crash — model returned
  `confidence=low` with note "image contains only visual noise", becoming an
  editable review draft with nothing confidently filled in.
- **CSV:** 31 rows parsed, the one deliberately bad row skipped and reported
  as an error, deposit row kept positive; all 31 saved with negative debits
  preserved.
- **Storage + tables RLS:** uploads, list, and reads all authorized for the
  owner only; test objects + user removed after.
- **Fixes found during verification:** default Gemini model no longer
  available for new keys → default is now `gemini-3.6-flash`; statement
  debits (negative amounts) were being rejected/dropped by the save path →
  amounts now allow any non-zero sign (zero still rejected).

## Phase 4 — RAG Pipeline — DONE (live-verified)

Question → embed → retrieve → grounded answer, all free tier, per-user RLS.

- **Embeddings** (`lib/embeddings.ts`): `embedText` / `embedTexts` via Gemini
  `gemini-embedding-2` at `outputDimensionality: 768` (matches `vector(768)`).
  The older `text-embedding-004` is a 404 for these API keys — found live.
  `buildContentText` now appends receipt `line_items` so item-level questions
  ("when did I buy the headphones?") match.
- **Retrieval** (`lib/retrieval.ts`): `retrieveTransactions` embeds the question
  then calls the `match_transactions` RPC. Structured filters extracted from
  the question: best-effort **category** (word-boundary keywords only — a
  substring collision where "headphones" fired the "phone" utility keyword was
  found and fixed) and **date range** ("past N days/weeks/months", "last
  month", "this month", explicit months). Comparison phrasings (vs/than/
  compare/difference) suppress both filters so totals aren't over-narrowed.
  Optional precomputed `embedding` param lets callers cache per question.
- **SQL** (`supabase/migrations/0007_rag.sql`, applied): `match_transactions
  (vector, int, text, date, date)` returns top-k via `1 - (embedding <=> $1)`
  with optional category/date predicates, `SECURITY INVOKER SET search_path =
  public` so RLS still scopes every call to the caller; execute granted to
  `authenticated` only (revoked from public/anon/service_role).
- **Grounded answers** (`lib/answer.ts`): Groq `/chat/completions` (default
  `openai/gpt-oss-120b`; `llama-3.3-70b-versatile` retired on Groq) with a
  strict no-fabrication system prompt — every number must be traceable to a
  retrieved transaction and cited inline `(merchant, MM/DD/YY, $amount)`.
  Deterministic short-circuits: 0 hits or top similarity < 0.35 →
  `"I don't have enough transaction data to answer that."` with no LLM call.
- **Endpoint** (`app/api/ask/route.ts`): POST, server-session auth, validates
  question (≤ 500 chars), clamps limit 1–50 (default 30), returns
  `{ question, answer, sources, filters }`; 400/401/500/503 shapes.
- **Ingestion hand-off** (`lib/actions/ingest.ts`): `saveExtractions` writes
  embeddings best-effort per saved row (try/catch — the backfill covers gaps).
- **Backfill** (`scripts/backfill.mts`, throwaway): fills receipts missing
  embeddings via `DATABASE_URL`; self-test passed (fresh, resume after a
  deleted embedding, idempotent). Real run: nothing missing.
- Verified: lint clean, build clean (`/api/ask` dynamic), migration `0007`
  applied + verified live (function exists, args correct, security invoker,
  HNSW index intact, execute → authenticated only).

### Live DoD — wiki `docs/rag-eval-questions.md` (2026-09-17)

Throwaway eval user seeded with **22 known transactions** (Jul/Aug 2026);
10 realistic questions answered end-to-end (retrieval + grounding), plus a
cross-user RLS probe:

- **10/10 questions PASS** (or correctly declined): groceries Aug = 109.52;
  Uber last 3 months = 32.01; subscriptions Aug = Netflix 15.49 + Spotify
  11.99; Trader Joe's last month = 62.40; headphones purchased 2026-08-18 via
  line-item text; food & dining Jul = 53.25; Aug−Jul = 196.12 (539.02 vs
  342.90, all 22 rows cited); biggest purchase = 129.99; gas last month =
  45.42 ("gas" deliberately not a category keyword — semantic match); flights
  to Japan → verbatim decline.
- **RLS through the RPC PASS**: second user's `match_transactions` returns 0
  rows (0 receipts visible).
- Every numeric answer cited merchant + date + amount from the dataset; zero
  fabricated numbers. Two real bugs caught and fixed during the eval:
  "headphones"→"phone" keyword substring collision; both embedding and Groq
  default models were retired on this key (204/404).
- Test users + data cleaned up after each run.

## Phase 5 — Dashboard UI — DONE (live-verified)

Five screens in the "one ledger sheet" visual identity (design of record:
`docs/dashboard-design-plan.md`), built on Phase 4's data/RAG layer.

- **Design system** (`app/globals.css` `@theme`): `paper`/`surface`/`ink`/
  `muted`/`rule`/`accent`/`accent-ink`/`danger` tokens; Fraunces display for
  page titles, hero month total, and the wordmark; Inter with `tabular-nums`
  for all data. Global `:focus-visible` and `prefers-reduced-motion` rules.
  No card grids, no shadows, no entrance animations — a single bordered sheet
  with internal hairline rules, per the appendix's generic-tell list.
- **Data layer**: `types/index.ts` (`Receipt`, `LineItem`), `lib/format.ts`
  (currency/date/month helpers), `lib/queries.ts`
  (`getDashboardData`, `getRecentReceipts`, `getFilteredReceipts`,
  `countReceipts`), `lib/actions/transactions.ts` (`updateTransaction`,
  `deleteTransaction`).
- **Dashboard** (`app/page.tsx`): month total + comparison sentence, category
  bars (`components/category-bars.tsx`), spend trend
  (`components/charts/spend-trend.tsx`, Recharts 3), recent transactions, and
  an empty state that offers the demo seed.
- **Transactions** (`app/transactions/page.tsx` +
  `components/transaction-table.tsx`): GET filter form (q / category / from /
  to), count + total line, inline edit and two-step delete via server actions.
- **Ask** (`app/ask/page.tsx` + `components/ask-panel.tsx`): transcript-style
  panel over `/api/ask`, bold/bullet answer rendering, sources list.
- **Upload** (`app/upload/page.tsx` + `components/upload-panel.tsx`): the
  choose → upload → read → review → saved step rule now shown per state.
- **Demo seed** (`lib/actions/demo.ts`): `loadDemoData()` inserts a 12-merchant,
  30-row six-month dataset with embeddings; refuses when the account already
  has receipts; revalidates dashboard/transactions/ask.
- **Nav** (`components/site-nav.tsx`, `components/site-header.tsx`): active
  underline, session-aware.

### Live DoD — smoke 24/24 (2026-09-17)

Authenticated HTTP smoke against a fresh `next dev`, using a forged
`@supabase/ssr` cookie (`sb-<ref>-auth-token` = `base64-` +
base64url(session JSON)) for two throwaway users, cleaned up after:

- **Demo mode (fresh account)**: empty state shown; demo load seeds 30
  transactions; dashboard populates; second load refused. 4/4.
- **Seeded account**: dashboard 200 with month total `$60.00`, comparison
  sentence, this-month categories and recent transactions; `/transactions` 200
  with 4-row count + total, merchant filter, category filter, invalid category
  ignored; `/ask` 200 with example questions; `/upload` 200 with the step
  rule. 19/19.
- Anonymous `/` still 307 → `/login`. 1/1.
- Fixes found: SSR inserts `<!-- -->` between adjacent text nodes (smoke
  normalizes them); dev-server process trees on Windows need
  `taskkill /T /F` (a `child.kill()` leaves `next dev` grandchildren holding
  the port). The one "regression" chased during verification was a bug in the
  throwaway smoke script's cookie header — not app code.
- `npm run lint` and `npm run build` clean (9 routes + proxy).

## Phase 6 — Admin Panel — DONE (live-verified)

Gated admin view: server-side role checks at the route AND the query, showing
only aggregate usage numbers.

- **Migration `0008_admin_stats.sql`** (applied): `admin_stats()` — one
  `SECURITY DEFINER` function, the only path to cross-user aggregates. It
  verifies `auth.uid()` has `role='admin'` on `profiles` **inside the
  function** and raises `admin access required` otherwise; returns JSON with
  user count + 30-day signup series (`generate_series` with zero-filled days)
  and receipt count + breakdown by `source_type` + `status`. Grants narrowed
  to `authenticated` (`revoke all` from public/anon/service_role first).
- **`lib/admin.ts`**: server-only `getAdminStats(supabase)` + `AdminStats`
  types; defensively normalizes the PostgREST row shape; returns `null` on
  any error/non-admin.
- **`app/admin/page.tsx`**: server component — reads the caller's own
  `profiles.role` (RLS-scoped) and `redirect("/")` for non-admins, then calls
  the RPC (defense in depth). Ledger-sheet UI: signed-up users total +
  signups chart (`components/admin/signups-chart.tsx`), transactions
  processed total, by-source bars, and an extraction-quality block
  (% auto-saved vs needs review). A line under the title states the policy:
  never individual transaction contents.
- **Nav**: `site-header` fetches own role; `site-nav` shows an Admin link
  only for admins (active-underline styling, non-admin never sees it).
- **`SECURITY.md`**: the "Where admins fit" section now documents the
  implemented model, why aggregate-only, and that promotion is SQL-only.
- Verified: lint clean, build clean (`/admin` route added). One fix during
  verification: supabase-js query builders aren't Promises, so `.catch()`
  doesn't exist on them — role fetch uses try/catch around the awaited call.

### Live DoD — smoke 17/17 (2026-09-17)

Throwaway migration runner (pg, removed after) applied `0008` and drove the
checks; two throwaway users + one regular user's 4 seeded receipts, all
deleted after (confirmed: profiles 0, receipts 0):

- Migration applied; `admin_stats()` exists; execute granted to
  `authenticated`, denied to `anon`. 3/3.
- SQL promotion: `update profiles set role='admin'` for the test user
  works (no UI path exists). 1/1.
- **Regular user blocked at both layers**: `GET /admin` → 307 `/`; direct
  `admin_stats()` call with the user's own JWT → `admin access required`.
  2/2.
- **Admin sees real aggregates**: `/admin` 200 and the page shows exactly the
  counts read straight from the DB (users total, receipts total, needs-review
  count, source-type counts all matched). Anonymous `/admin` → 307 `/login`.
  11/11.

## Roadmap

| Phase | File | Status |
|---|---|---|
| 0 | 00-project-brief.md | Done (context) |
| 1 | 01-setup-and-architecture.md | Done |
| 2 | 02-auth-and-database.md | **Done** |
| 3 | 03-ingestion-pipeline.md | **Done** |
| 4 | 04-rag-pipeline.md | **Done** |
| 5 | 05-dashboard-ui.md | **Done** |
| 6 | 06-admin-panel.md | **Done** |
| 7 | 07-security-hardening.md | Pending |
| 8 | 08-polish-and-deploy.md | Pending |