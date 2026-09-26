-- Optional development-only seed helper.
-- This migration creates a function but does NOT insert sample data automatically.
-- Call: select public.seed_demo_crm('<database_uuid>'); as an authenticated OWNER/ADMIN/MEMBER.

create or replace function public.seed_demo_crm(p_database_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_user_id uuid := (select auth.uid());
  v_title uuid;
  v_status uuid;
  v_revenue uuid;
  v_count integer := 0;
  v_brand text;
  v_status_value text;
  v_revenue_value numeric;
begin
  select d.workspace_id into v_workspace_id
  from public.workspace_databases d
  where d.id = p_database_id and d.archived_at is null;

  if v_workspace_id is null then raise exception 'Database not found'; end if;
  if not (select private.has_workspace_role(v_workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])) then
    raise exception 'Not authorized';
  end if;

  select p.id into v_title from public.database_properties p
    where p.database_id = p_database_id and p.property_type = 'title' and p.archived_at is null limit 1;
  select p.id into v_status from public.database_properties p
    where p.database_id = p_database_id and p.name = 'Status' and p.archived_at is null limit 1;
  select p.id into v_revenue from public.database_properties p
    where p.database_id = p_database_id and p.name = 'Revenue' and p.archived_at is null limit 1;

  for v_brand, v_status_value, v_revenue_value in
    select * from (values
      ('LayerStory','follow-up',75000::numeric),
      ('Miniklub','lead',45000::numeric),
      ('Renee Cosmetics','potential',120000::numeric),
      ('Riderz Planet','first-call',30000::numeric),
      ('Rupa','closing',160000::numeric),
      ('Scandolous Foods','closed',95000::numeric)
    ) as t(brand,status_value,revenue_value)
  loop
    insert into public.database_rows(database_id, workspace_id, created_by, updated_by, data, position)
    values (
      p_database_id,
      v_workspace_id,
      v_user_id,
      v_user_id,
      jsonb_build_object(v_title::text, v_brand, v_status::text, v_status_value, v_revenue::text, v_revenue_value),
      extract(epoch from clock_timestamp()) * 1000 + v_count
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.seed_demo_crm(uuid) from public;
grant execute on function public.seed_demo_crm(uuid) to authenticated;
