# Phase 2: Auth & Database

## Context
Scaffold exists from Phase 1. This phase adds real login/signup and the
full database schema with row-level security — the security foundation
everything else builds on.

## Constraints
- Row-level security (RLS) must be enforced at the database level, not
  just checked in app code.
- Passwords are never handled directly — Supabase Auth owns that.
- Admin is a flag on the user profile, not a separate auth system.

## The Prompt

```
Add authentication and the database schema to the Ledger app (Next.js +
Supabase, scaffold already exists).

1. Auth:
   - Email/password signup and login using Supabase Auth.
   - Add Google OAuth as a second sign-in option.
   - Build /login and /signup pages, and protect all app routes so
     signed-out users are redirected to /login.
   - Add a working sign-out action.

2. Database schema (Postgres via Supabase), with SQL migration files:
   - `profiles` table: id (references auth.users), email, role (text,
     default 'user', can be 'admin'), created_at.
   - `receipts` table: id, user_id, merchant, transaction_date, amount,
     category, source_type ('receipt' | 'statement_line'), raw_file_url,
     line_items (jsonb, nullable), created_at.
   - `transaction_embeddings` table: id, receipt_id (fk), user_id,
     embedding (vector type via pgvector), content_text (the text that was
     embedded), created_at.
   - Enable the pgvector extension.

3. Row-level security:
   - Enable RLS on every table above.
   - Policy: a user can only SELECT/INSERT/UPDATE/DELETE rows where
     user_id = auth.uid().
   - Separate policy: users with role = 'admin' in `profiles` can SELECT
     aggregate-safe views (not raw transaction contents) — we'll define
     exactly what the admin can see in the admin panel phase, so for now
     just make sure regular RLS blocks cross-user access completely, and
     leave a clear SQL comment marking where admin policies will extend
     this.

4. On signup, auto-create a matching `profiles` row via a Postgres
   trigger, not app code, so it can't be skipped or forged from the
   client.

5. Write a short SECURITY.md explaining the RLS model in plain language —
   this becomes part of the interview talking points.

Test: create two test users, confirm user A cannot query or see user B's
data even via direct Supabase client calls, not just through the UI.
```

## Definition of done
- Signup/login/logout works end to end.
- RLS verified with a real cross-user test, not just "policy exists."
- SECURITY.md explains the model in a way you could explain out loud in an
  interview.
