-- profiles: app-level data that extends auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user'
    constraint profiles_role_check check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read exactly their own profile and nothing else.
create policy "Profiles are visible to their owner"
  on public.profiles
  for select
  using (auth.uid() = id);

-- There are intentionally no insert/update/delete policies and no write
-- grants on profiles:
--   * INSERT would let a client forge a profile (or an 'admin' row).
--   * profile rows are created exclusively by the on-signup trigger below,
--     which runs with SECURITY DEFINER so it bypasses RLS.
--   * promoting a user to 'admin' is done from a privileged context
--     (SQL console / server-side service role) in the admin phase, never
--     through the public client.

grant select on public.profiles to authenticated;

-- Auto-create a profile on signup so it can't be skipped or forged from the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();