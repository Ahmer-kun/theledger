-- transaction_embeddings: vector stores for RAG over transactions.
create table public.transaction_embeddings (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  embedding vector(768),
  content_text text not null,
  created_at timestamptz not null default now()
);

create index transaction_embeddings_user_id_idx on public.transaction_embeddings (user_id);
create index transaction_embeddings_receipt_idx on public.transaction_embeddings (receipt_id);
-- ANN index for approximate nearest-neighbor search (tuned in Phase 4).
create index transaction_embeddings_hnsw_idx
  on public.transaction_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.transaction_embeddings enable row level security;

create policy "Users manage their own embeddings"
  on public.transaction_embeddings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.transaction_embeddings to authenticated;

-- Phase 6 extension point (admin panel):
-- Admin-only aggregate endpoints will be added here as SECURITY DEFINER
-- functions or views that expose counts/sums only (never other users' raw
-- rows), guarded by an explicit admin-role check. The policies above already
-- prevent all cross-user access for regular users.