-- Rag: semantic search over a user's own transactions.
-- Called through PostgREST as the signed-in user: SECURITY INVOKER means
-- row-level security on transaction_embeddings and receipts still applies,
-- so the function can only ever see (and return) the caller's own rows.

create or replace function public.match_transactions(
  p_embedding vector,
  p_limit int default 20,
  p_category text default null,
  p_start date default null,
  p_end date default null
)
returns table (
  receipt_id uuid,
  user_id uuid,
  merchant text,
  transaction_date date,
  amount numeric,
  category text,
  content_text text,
  similarity double precision
)
language sql
security invoker
set search_path = public
as $$
  select
    te.receipt_id,
    te.user_id,
    r.merchant,
    r.transaction_date,
    r.amount,
    r.category,
    te.content_text,
    1 - (te.embedding <=> p_embedding) as similarity
  from public.transaction_embeddings te
  join public.receipts r on r.id = te.receipt_id
  where (p_category is null or r.category = p_category)
    and (p_start is null or r.transaction_date >= p_start)
    and (p_end is null or r.transaction_date <= p_end)
  order by te.embedding <=> p_embedding
  limit p_limit;
$$;

revoke all on function public.match_transactions(vector, int, text, date, date) from public, anon, service_role;

grant execute on function public.match_transactions(vector, int, text, date, date)
  to authenticated;