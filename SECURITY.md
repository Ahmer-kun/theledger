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

## Where admins fit (Phase 6 extension point)

The RLS model for regular users is complete. Admin analytics will be exposed
only through aggregate endpoints — counts and sums, never another user's raw
transaction rows — enforced by separate database-level checks, not hidden
columns in the UI.

## How to verify the boundary (do this once, prove it in demos)

1. Create two users (A and B).
2. As user A, insert a row into `receipts`.
3. As user B, run the same read/update/delete queries — every write must
   affect **zero rows** and every read must return **zero rows**.
4. Confirm the app-level redirects never serve user B's data either.

See `supabase/migrations/` for the exact policies.