-- Create private storage bucket for user uploads (receipts, statements).
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do nothing;

-- Storage object RLS — scoped to the user's own folder (${uid}/${uuid}/${file}).
create policy "Users upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users read own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update own files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Receipt review status: 'needs_review' for low-confidence extractions.
alter table public.receipts
  add column status text not null default 'saved'
  check (status in ('saved', 'needs_review'));