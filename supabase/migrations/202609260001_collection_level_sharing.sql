begin;

create table public.collection_share_links (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null unique references public.workspace_databases(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.collection_shares (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.workspace_databases(id) on delete cascade,
  grantee_email text not null check (grantee_email = lower(btrim(grantee_email)) and grantee_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  grantee_user_id uuid references auth.users(id) on delete set null,
  permission text not null check (permission in ('view', 'edit', 'admin')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index collection_shares_active_email_idx on public.collection_shares(database_id, grantee_email) where revoked_at is null;
create index collection_shares_user_database_idx on public.collection_shares(grantee_user_id, database_id) where revoked_at is null;

alter table public.collection_share_links enable row level security;
alter table public.collection_shares enable row level security;

create or replace function private.collection_share_level(p_database_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.permission
  from public.collection_shares s
  where s.database_id = p_database_id and s.revoked_at is null
    and (s.grantee_user_id = (select auth.uid()) or s.grantee_email = private.current_email())
  order by case s.permission when 'admin' then 3 when 'edit' then 2 else 1 end desc
  limit 1;
$$;

create or replace function private.can_manage_collection_share(p_database_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.workspace_databases d
    where d.id = p_database_id and d.archived_at is null and (
      (d.created_by = (select auth.uid()) and private.is_workspace_member(d.workspace_id) and (
        d.team_id is null or exists (
          select 1 from public.team_members tm where tm.team_id = d.team_id and tm.user_id = (select auth.uid())
        )
      ))
      or private.has_workspace_role(d.workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
      or private.collection_share_level(d.id) = 'admin'
    )
  );
$$;

create or replace function public.ensure_collection_share_link(p_database_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_link_id uuid;
begin
  if (select auth.uid()) is null or not private.can_manage_collection_share(p_database_id) then raise exception 'Access denied'; end if;
  select id into v_link_id from public.collection_share_links where database_id = p_database_id and revoked_at is null;
  if v_link_id is null then
    insert into public.collection_share_links(database_id, created_by) values (p_database_id, (select auth.uid())) returning id into v_link_id;
  end if;
  return v_link_id;
end; $$;

create or replace function public.list_collection_shares(p_database_id uuid)
returns table(id uuid, email text, permission text, display_name text, is_owner boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_collection_share(p_database_id) then raise exception 'Access denied'; end if;
  return query
    select null::uuid, lower(u.email)::text, 'owner'::text, p.full_name, true
    from public.workspace_databases d join auth.users u on u.id = d.created_by left join public.profiles p on p.id = u.id
    where d.id = p_database_id
    union all
    select s.id, s.grantee_email, s.permission, p.full_name, false
    from public.collection_shares s left join public.profiles p on p.id = s.grantee_user_id
    where s.database_id = p_database_id and s.revoked_at is null
    order by 5 desc, 2;
end; $$;

create or replace function public.grant_collection_share(p_database_id uuid, p_email text, p_permission text)
returns table(link_id uuid, share_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(p_email)); v_share_id uuid; v_link_id uuid; v_user_id uuid;
begin
  if not private.can_manage_collection_share(p_database_id) then raise exception 'Access denied'; end if;
  if p_permission not in ('view','edit','admin') then raise exception 'Invalid permission'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  if v_email = private.current_email() then raise exception 'You already own or manage this collection'; end if;
  if exists (
    select 1 from public.workspace_databases d join auth.users u on u.id = d.created_by
    where d.id = p_database_id and lower(u.email) = v_email
  ) then raise exception 'The collection owner already has access'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  insert into public.collection_shares(database_id, grantee_email, grantee_user_id, permission, created_by)
  values (p_database_id, v_email, v_user_id, p_permission, (select auth.uid()))
  on conflict (database_id, grantee_email) where revoked_at is null do update
    set permission = excluded.permission, grantee_user_id = coalesce(excluded.grantee_user_id, public.collection_shares.grantee_user_id), updated_at = now()
  returning id into v_share_id;
  v_link_id := public.ensure_collection_share_link(p_database_id);
  return query select v_link_id, v_share_id;
end; $$;

create or replace function public.update_collection_share(p_share_id uuid, p_permission text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid;
begin
  if p_permission not in ('view','edit','admin') then raise exception 'Invalid permission'; end if;
  select database_id into v_database_id from public.collection_shares where id = p_share_id and revoked_at is null;
  if v_database_id is null or not private.can_manage_collection_share(v_database_id) then raise exception 'Access denied'; end if;
  update public.collection_shares set permission = p_permission, updated_at = now() where id = p_share_id;
end; $$;

create or replace function public.revoke_collection_share(p_share_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid;
begin
  select database_id into v_database_id from public.collection_shares where id = p_share_id and revoked_at is null;
  if v_database_id is null or not private.can_manage_collection_share(v_database_id) then raise exception 'Access denied'; end if;
  update public.collection_shares set revoked_at = now(), updated_at = now() where id = p_share_id;
end; $$;

create or replace function public.get_shared_collection(p_link_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid; v_permission text; v_result jsonb;
begin
  select database_id into v_database_id from public.collection_share_links where id = p_link_id and revoked_at is null;
  if v_database_id is null then return null; end if;
  if private.can_manage_collection_share(v_database_id) then v_permission := 'admin'; else v_permission := private.collection_share_level(v_database_id); end if;
  if v_permission is null then raise exception 'Access denied'; end if;
  select jsonb_build_object(
    'permission', v_permission,
    'workspaceName', w.name,
    'database', to_jsonb(d),
    'properties', coalesce((select jsonb_agg(to_jsonb(dp) order by dp.position) from public.database_properties dp where dp.database_id = d.id and dp.archived_at is null), '[]'::jsonb),
    'views', coalesce((select jsonb_agg(to_jsonb(dv) order by dv.position) from public.database_views dv where dv.database_id = d.id), '[]'::jsonb),
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.position, r.created_at) from public.database_rows r where r.database_id = d.id and r.archived_at is null), '[]'::jsonb)
  ) into v_result
  from public.workspace_databases d join public.workspaces w on w.id = d.workspace_id
  where d.id = v_database_id and d.archived_at is null;
  return v_result;
end; $$;

create or replace function public.update_shared_collection_value(p_link_id uuid, p_row_id uuid, p_property_id uuid, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid; v_permission text; v_row public.database_rows;
begin
  select database_id into v_database_id from public.collection_share_links where id = p_link_id and revoked_at is null;
  if private.can_manage_collection_share(v_database_id) then v_permission := 'admin'; else v_permission := private.collection_share_level(v_database_id); end if;
  if v_permission not in ('edit','admin') then raise exception 'Access denied'; end if;
  if not exists (select 1 from public.database_rows where id = p_row_id and database_id = v_database_id and archived_at is null) then raise exception 'Invalid row'; end if;
  if not exists (select 1 from public.database_properties where id = p_property_id and database_id = v_database_id and archived_at is null) then raise exception 'Invalid property'; end if;
  update public.database_rows
  set data = case when p_value is null or p_value = 'null'::jsonb or p_value = '""'::jsonb then data - p_property_id::text else jsonb_set(data, array[p_property_id::text], p_value, true) end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = p_row_id and database_id = v_database_id
  returning * into v_row;
  return to_jsonb(v_row);
end; $$;

revoke all on function public.ensure_collection_share_link(uuid), public.list_collection_shares(uuid), public.grant_collection_share(uuid,text,text), public.update_collection_share(uuid,text), public.revoke_collection_share(uuid), public.get_shared_collection(uuid), public.update_shared_collection_value(uuid,uuid,uuid,jsonb) from public;
grant execute on function public.ensure_collection_share_link(uuid), public.list_collection_shares(uuid), public.grant_collection_share(uuid,text,text), public.update_collection_share(uuid,text), public.revoke_collection_share(uuid), public.get_shared_collection(uuid), public.update_shared_collection_value(uuid,uuid,uuid,jsonb) to authenticated;

commit;
