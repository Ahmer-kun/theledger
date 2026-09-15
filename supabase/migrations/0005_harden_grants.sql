-- Tighten table grants. Supabase's default privileges grant full DML to
-- anon/authenticated on every new public table; RLS still gates rows, but
-- TRUNCATE is not covered by RLS and profiles must be select-only, so make
-- the grants themselves match the security model.

-- Profiles: clients may only read their own row. No writes at all —
-- insertion is done by the SECURITY DEFINER signup trigger.
revoke insert, update, delete, truncate, references, trigger
  on public.profiles
  from anon, authenticated;

-- Receipts / embeddings: anon is not needed for any DML.
revoke all
  on public.receipts
  from anon;

revoke all
  on public.transaction_embeddings
  from anon;

-- Authenticated users keep row-level DML on their own rows, but never
-- TRUNCATE (table-wide, not filtered by RLS).
revoke truncate, references, trigger
  on public.receipts
  from authenticated;

revoke truncate, references, trigger
  on public.transaction_embeddings
  from authenticated;