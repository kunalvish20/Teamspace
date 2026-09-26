create or replace function public.get_collection_dashboard_data(p_database_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with allowed_database as (
    select d.id from public.workspace_databases d
    where d.id = p_database_id and d.archived_at is null
  )
  select case when exists (select 1 from allowed_database) then jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at)
      from public.database_rows r
      where r.database_id = p_database_id and r.archived_at is null
    ), '[]'::jsonb)
  ) else null end;
$$;

revoke all on function public.get_collection_dashboard_data(uuid) from public;
grant execute on function public.get_collection_dashboard_data(uuid) to authenticated;
