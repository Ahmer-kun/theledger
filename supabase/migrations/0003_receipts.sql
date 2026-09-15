-- receipts: one row per receipt photo or extracted statement line.
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant text not null,
  transaction_date date not null,
  amount numeric(12, 2) not null
    constraint receipts_amount_check check (amount <> 0),
  category text,
  source_type text not null default 'receipt'
    constraint receipts_source_type_check check (source_type in ('receipt', 'statement_line')),
  raw_file_url text,
  line_items jsonb,
  created_at timestamptz not null default now()
);

create index receipts_user_id_idx on public.receipts (user_id);
create index receipts_user_date_idx on public.receipts (user_id, transaction_date desc);

alter table public.receipts enable row level security;

-- A user can fully manage rows where user_id is their own auth.uid().
-- The WITH CHECK clause prevents a client from inserting or rewriting a row
-- into another user's ownership.
create policy "Users manage their own receipts"
  on public.receipts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.receipts to authenticated;