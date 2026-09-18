-- Gated admin analytics. One SECURITY DEFINER function is the ONLY path to
-- cross-user aggregate numbers; it verifies the caller's role itself, so a
-- regular user (or anyone with an authenticated JWT) calling admin_stats()
-- directly gets an access_denied error, not data. Row-level security alone
-- can't provide cross-user aggregates, so this function bypasses it — but
-- only after proving the caller is an admin, and it never returns a single
-- user's raw transaction contents.

create or replace function public.admin_stats()
returns table (data jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = caller_id and role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'admin access required';
  end if;

  return query
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*)::int from public.profiles),
      'signups', coalesce((
        select jsonb_agg(
                 jsonb_build_object('day', series.day, 'count', series.count)
                 order by series.day
               )
        from (
          select calendar.day::date                        as day,
                 count(p.id)::int                          as count
          from generate_series(
                 current_date - 29,
                 current_date,
                 interval '1 day'
               ) as calendar(day)
          left join public.profiles p
            on (p.created_at at time zone 'utc')::date = calendar.day::date
          group by calendar.day::date
        ) as series
      ), '[]'::jsonb)
    ),
    'receipts', jsonb_build_object(
      'total', (select count(*)::int from public.receipts),
      'by_source', coalesce((
        select jsonb_agg(
                 jsonb_build_object('source_type', grouped.source_type,
                                    'count', grouped.count)
                 order by grouped.count desc
               )
        from (
          select r.source_type, count(*)::int as count
          from public.receipts r
          group by r.source_type
        ) as grouped
      ), '[]'::jsonb),
      'saved', (select count(*)::int from public.receipts where status = 'saved'),
      'needs_review', (select count(*)::int from public.receipts where status = 'needs_review')
    )
  );
end;
$$;

revoke all on function public.admin_stats() from public, anon, service_role;

grant execute on function public.admin_stats() to authenticated;