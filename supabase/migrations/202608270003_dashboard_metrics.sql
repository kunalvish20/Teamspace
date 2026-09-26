create or replace function public.get_crm_dashboard_metrics(p_database_id uuid)
returns table(
  total_records bigint,
  leads bigint,
  follow_ups bigint,
  potential bigint,
  closing bigint,
  closed bigint,
  total_revenue numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status uuid;
  v_revenue uuid;
begin
  select p.id into v_status
  from public.database_properties p
  where p.database_id = p_database_id and p.name = 'Status' and p.archived_at is null
  limit 1;

  select p.id into v_revenue
  from public.database_properties p
  where p.database_id = p_database_id and p.name = 'Revenue' and p.archived_at is null
  limit 1;

  return query
  select
    count(*)::bigint,
    count(*) filter (where r.data ->> v_status::text = 'lead')::bigint,
    count(*) filter (where r.data ->> v_status::text = 'follow-up')::bigint,
    count(*) filter (where r.data ->> v_status::text = 'potential')::bigint,
    count(*) filter (where r.data ->> v_status::text = 'closing')::bigint,
    count(*) filter (where r.data ->> v_status::text = 'closed')::bigint,
    coalesce(sum(
      case
        when v_revenue is not null and coalesce(r.data ->> v_revenue::text, '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
          then (r.data ->> v_revenue::text)::numeric
        else 0
      end
    ), 0)::numeric
  from public.database_rows r
  where r.database_id = p_database_id and r.archived_at is null;
end;
$$;

revoke all on function public.get_crm_dashboard_metrics(uuid) from public;
grant execute on function public.get_crm_dashboard_metrics(uuid) to authenticated;
