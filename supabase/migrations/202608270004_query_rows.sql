create or replace function public.query_database_rows(
  p_database_id uuid,
  p_workspace_id uuid,
  p_filters jsonb default '[]'::jsonb,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns setof public.database_rows
language sql
stable
security invoker
set search_path = ''
as $$
  select r.*
  from public.database_rows r
  where r.database_id = p_database_id
    and r.workspace_id = p_workspace_id
    and r.archived_at is null
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_filters, '[]'::jsonb)) f
      where f ->> 'operator' = 'equals'
        and not (r.data @> jsonb_build_object(f ->> 'propertyId', f -> 'value'))
    )
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or exists (
        select 1
        from jsonb_each_text(r.data) cell(key, value)
        join public.database_properties p
          on p.id::text = cell.key
         and p.database_id = p_database_id
         and p.archived_at is null
         and p.property_type in ('title','text','phone','email','url')
        where cell.value ilike '%' || trim(p_search) || '%'
      )
    )
  order by r.position asc, r.created_at asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.query_database_rows(uuid, uuid, jsonb, text, integer, integer) from public;
grant execute on function public.query_database_rows(uuid, uuid, jsonb, text, integer, integer) to authenticated;
