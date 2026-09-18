# Ledger — Security Model

This document explains how Ledger keeps one user's financial data away from
everyone else, in plain language. It's the model you can walk an interviewer
through out loud.

## Short version

Every row of user data in the database is scoped to its owner with a
**`user_id` column**, and **row-level security (RLS)** makes the database
itself enforce "you can only touch rows where `user_id = your id`". This is
not enforced in the app — it's enforced in Postgres, so it holds even if
someone calls the Supabase API directly with a leaked key, bypasses the UI,
or writes their own client.

## The three layers

| Layer | What it does |
|---|---|
| **Supabase Auth** | Owns credentials. The app never sees or stores a password; Supabase stores only a bcrypt hash and issues short-lived JWTs. |
| **Row-level security** | Postgres refuses any query whose row doesn't satisfy the policy for the authenticated user — even `SELECT *` returns zero rows for another user's data. |
| **App-layer helpers** | The Next.js proxy and server components handle session refresh and redirect signed-out users — UX convenience, not the security boundary. |

## The schema

| Table | RLS policy |
|---|---|
| `profiles` | SELECT only, for the row matching `auth.uid()`. No insert/update/delete from clients at all. |
| `receipts` | Owner can `SELECT/INSERT/UPDATE/DELETE` their own rows (`user_id = auth.uid()`). |
| `transaction_embeddings` | Owner can `SELECT/INSERT/UPDATE/DELETE` their own rows. |

Two details are deliberate:

1. **Profiles are created by a database trigger**, not the app. When a user
   signs up, a `SECURITY DEFINER` trigger inserts their `profiles` row. The
   client cannot insert a profile (that would let someone forge an `admin`
   row) — the trigger is the only writer.
2. **`admin` is just a value in `profiles.role`**, but clients can never
   write to that column. Promoting a user to admin happens from a
   privileged context (SQL console or server-side service role) in a later
   phase, or via a dedicated admin operation — never through the public API.
   No separate auth system.

## Row-level security is the boundary, not the UI

Even if the UI is bypassed — say, a request signed with an `anon` key hits
the database directly — RLS still filters every result against `auth.uid()`.
The `WITH CHECK` clause on write policies does double duty: it blocks a
client from `UPDATE`-ing an existing row to reassign it to someone else, and
blocks `INSERT`ing a row for another user.

## Where admins fit (Phase 6)

The RLS model for regular users is complete. Admin analytics are exposed only
through aggregate endpoints — counts and sums, never another user's raw
transaction rows:

- **`/admin`** is a server component that reads the caller's own `profiles.role`
  (RLS-scoped) and redirects non-admins. That check is UX; the real gate is
  the query.
- **`admin_stats()`** (`supabase/migrations/0008_admin_stats.sql`) is a
  `SECURITY DEFINER` database function — the *only* path to cross-user
  aggregates. It verifies `auth.uid()` is an admin **inside the function**
  before returning anything, so calling it directly with a regular user's JWT
  (bypassing the UI entirely) returns an `admin access required` error, not
  data. It returns only aggregate counts.
- **Promotion to admin is SQL-only.** There is no UI toggle. `profiles.role`
  has no client write grant, so the only writer is a privileged context
  (SQL console / service role).

Why aggregate-only: the product needs a high-level view of usage, which can
be served entirely by counts and rates — and keeping the admin surface
aggregate-only means there's no code path that can leak another user's
financial records, so the boundary stays small enough to reason about.

## How to verify the boundary (do this once, prove it in demos)

1. Create two users (A and B).
2. As user A, insert a row into `receipts`.
3. As user B, run the same read/update/delete queries — every write must
   affect **zero rows** and every read must return **zero rows**.
4. Confirm the app-level redirects never serve user B's data either.

See `supabase/migrations/` for the exact policies.

## Phase 7 hardening — what was tested and confirmed (Sep 2026)

### 1. RLS re-audit with crafted direct-API attempts (live)

Two throwaway users (A, B) plus a session-less `anon` client, hitting the
Supabase API directly (bypassing the UI) for **every** table and for storage:

- **`receipts`**: B cannot read A's row (0 rows), update it (0 rows matched,
  A's row survives unmodified), delete it (row survives intact), or **forge**
  a new row owned by A (INSERT blocked by the `WITH CHECK` clause → error).
  B sees only their own rows under plain `SELECT`.
- **`transaction_embeddings`**: B cannot read, update, or delete A's rows —
  the embedding row survives byte-for-byte after B's update/delete attempts.
- **`profiles`**: B cannot read A's profile; B (and A) cannot write profiles
  at all — even updating their **own** `role` to `admin` is a permission
  error, so client-side admin escalation is impossible end to end.
- **Storage (`user-files` bucket)**: B cannot upload into, list, or download
  A's folder. A can upload/download their own. All four storage policies
  (insert/select/update/delete) are folder-scoped to `auth.uid()`.
- **Functions**: `match_transactions` (SECURITY INVOKER) returns **zero of
  A's rows** to B, and is not executable by `anon`. `admin_stats()` (Phase 6)
  rejects regular users and anon.
- **Fixes during audit**: a signed-in user's request to `/api/*` was being
  307-redirected to `/` by the middleware (its "signed-in users hitting
  public routes go home" branch also matched API routes). API routes are now
  excluded from that redirect (`proxy.ts`), so `/api/ask` reaches its handler
  and its own auth/rate-limit logic applies.

Every cross-user attempt above was started after A's data was seeded and the
attacker (B/anon) had full freedom to pick table, column, and value; all were
denied. **No migration changes were needed** — the Phase 2/4/5 policies held.

### 2. Rate limiting (`lib/rate-limit.ts`)

Free-tier-friendly **in-memory fixed-window** limiter, keyed per user. Runs
*before* any LLM call (and before body parsing), so a leaked session can't
burn the Gemini/Groq budget:

| Limit | Config |
|---|---|
| `/api/ask` | 20 requests / 60 s |
| file upload | 15 / 60 s |
| extraction (`extractFromStored`) | 10 / 60 s |

429 responses carry `Retry-After` and a generic body. Verified live: a fresh
user's calls are allowed up to the window budget, then every further request
returns 429 with `Retry-After` while identical valid calls continue to work
for a *different* previously-unused user (keys are isolated per user).

> Known limitation: state is per process/warm instance. On Vercel's
> serverless runtime that means the limit is per-instance, not global. That's
> the intended first pass — it stops a runaway client or leaked session. If a
> strict global budget is ever needed, swap the backend for Upstash (free
> tier) without changing the call sites.

### 3. Content-based file type validation (`lib/file-kind.ts`)

Uploads are no longer trusted on extension / browser MIME alone:

- **Magic-byte sniffing** (`sniffFileKind`): JPEG/PNG/WebP/PDF signatures;
  anything else must be NUL-free printable text or it's rejected (executables,
  archives, and other binaries can't pose as `csv`/`image`/`pdf`).
- **Cross-check** (`reconcileFileKind` + `claimedImageMime`): the declared
  kind (MIME + extension) must agree with the sniffed kind; for images the
  specific type must also match (a PNG renamed `.jpg` or declared
  `image/jpeg` is rejected). A generic `application/octet-stream` or
  ext-less claim falls back to trusting content.
- Applied in `uploadFile` *before* anything is written to storage; size is
  already capped server-side at 8 MB (`next.config.ts` raises the server
  action body limit to 10 MB to allow that).
- The exact production decision path is unit-tested: PNG-as-JPG, CSV-as-PNG,
  renamed PDF, EXE rejection, generic-MIME trust.

### 4. Secrets audit

- `git log --all -- .env.local` → **empty**: `.env.local` has never been
  committed.
- `git ls-files ".env*"` → only `.env.local.example` (placeholders, no real
  values) is tracked.
- Full-history and working-tree scans for key patterns (`eyJhbGciOi…` JWTs,
  Gemini `AIza…` keys, Groq `gsk_…` keys, `sk-…`, Postgres URLs with
  passwords) → **no matches** in any commit or tracked file.
- Real keys exist only in the gitignored `.env.local` (`git check-ignore`
  confirms).

### 5. Parameterized input

All user text reaches the database through PostgREST's bound-parameter query
builder — there is no raw SQL string concatenation anywhere in `lib/`.
Verified live: a merchant value `Bob'); DROP TABLE receipts;--` and a
category `Food' OR '1'='1` are stored and round-tripped *literally* (nothing
executed, table intact, `ilike` filters match only the literal value).

### 6. Client-facing errors never leak internals

`/api/ask` (the only route that returns arbitrary internal dynamics) now logs
the full error server-side (`console.error`) and returns a fixed generic
message. During the live audit, a transient provider error produced exactly
this: the server log carried the stack, the client received no details.
`uploadFile`/`extractFromStored`/`saveExtractions` already returned curated
messages. On top of that, embedding fetches get one retry for transient
connect failures (`lib/embeddings.ts`) so a cold-start `fetch failed` doesn't
surface as a user-facing 500.

### 7. Response headers

`proxy.ts` adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive
`Permissions-Policy` on every proxied response. (Verified in the live audit.)

### Residual risks

- Per-instance rate limits (see above) and per-LLM free-tier quotas are the
  cost ceilings; a distributed attacker could still consume budget across
  many instances. Acceptable for the $0 budget.
- Redis/CDN-style HTTP caching and a full CSP are out of scope for now; no
  user data is served from `_next/static` or an image cache.
- RLS, not app checks, is the security boundary — keep future endpoints
  behind user-scoped policies (never "SELECT all then filter").