begin;

-- Drop obsolete 4-argument function to eliminate PostgREST overloading ambiguity
drop function if exists public.create_workspace_database(uuid, text, text, public.database_view_type);

create table public.record_share_links (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null unique references public.database_rows(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.record_shares (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.database_rows(id) on delete cascade,
  grantee_email text not null check (grantee_email = lower(btrim(grantee_email)) and grantee_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  grantee_user_id uuid references auth.users(id) on delete set null,
  permission text not null check (permission in ('view', 'edit', 'admin')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index record_shares_active_email_idx on public.record_shares(row_id, grantee_email) where revoked_at is null;
create index record_shares_user_row_idx on public.record_shares(grantee_user_id, row_id) where revoked_at is null;

alter table public.record_share_links enable row level security;
alter table public.record_shares enable row level security;
-- No direct table policies: all access goes through the validated functions below.

create or replace function private.current_email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), ''));
$$;

create or replace function private.record_share_level(p_row_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.permission
  from public.record_shares s
  where s.row_id = p_row_id and s.revoked_at is null
    and (s.grantee_user_id = (select auth.uid()) or s.grantee_email = private.current_email())
  order by case s.permission when 'admin' then 3 when 'edit' then 2 else 1 end desc
  limit 1;
$$;

create or replace function private.can_manage_record_share(p_row_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.database_rows r join public.workspace_databases d on d.id = r.database_id
    where r.id = p_row_id and r.archived_at is null and (
      (r.created_by = (select auth.uid()) and private.is_workspace_member(r.workspace_id) and (
        d.team_id is null or exists (
          select 1 from public.team_members tm where tm.team_id = d.team_id and tm.user_id = (select auth.uid())
        )
      ))
      or private.has_workspace_role(r.workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
      or private.record_share_level(r.id) = 'admin'
    )
  );
$$;

create or replace function public.ensure_record_share_link(p_row_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_link_id uuid;
begin
  if (select auth.uid()) is null or not private.can_manage_record_share(p_row_id) then raise exception 'Access denied'; end if;
  select id into v_link_id from public.record_share_links where row_id = p_row_id and revoked_at is null;
  if v_link_id is null then
    insert into public.record_share_links(row_id, created_by) values (p_row_id, (select auth.uid())) returning id into v_link_id;
  end if;
  return v_link_id;
end; $$;

create or replace function public.list_record_shares(p_row_id uuid)
returns table(id uuid, email text, permission text, display_name text, is_owner boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_record_share(p_row_id) then raise exception 'Access denied'; end if;
  return query
    select null::uuid, lower(u.email)::text, 'owner'::text, p.full_name, true
    from public.database_rows r join auth.users u on u.id = r.created_by left join public.profiles p on p.id = u.id
    where r.id = p_row_id
    union all
    select s.id, s.grantee_email, s.permission, p.full_name, false
    from public.record_shares s left join public.profiles p on p.id = s.grantee_user_id
    where s.row_id = p_row_id and s.revoked_at is null
    order by 5 desc, 2;
end; $$;

create or replace function public.grant_record_share(p_row_id uuid, p_email text, p_permission text)
returns table(link_id uuid, share_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(p_email)); v_share_id uuid; v_link_id uuid; v_user_id uuid;
begin
  if not private.can_manage_record_share(p_row_id) then raise exception 'Access denied'; end if;
  if p_permission not in ('view','edit','admin') then raise exception 'Invalid permission'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  if v_email = private.current_email() then raise exception 'You already own or manage this record'; end if;
  if exists (
    select 1 from public.database_rows r join auth.users u on u.id = r.created_by
    where r.id = p_row_id and lower(u.email) = v_email
  ) then raise exception 'The record owner already has access'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  insert into public.record_shares(row_id, grantee_email, grantee_user_id, permission, created_by)
  values (p_row_id, v_email, v_user_id, p_permission, (select auth.uid()))
  on conflict (row_id, grantee_email) where revoked_at is null do update
    set permission = excluded.permission, grantee_user_id = coalesce(excluded.grantee_user_id, public.record_shares.grantee_user_id), updated_at = now()
  returning id into v_share_id;
  v_link_id := public.ensure_record_share_link(p_row_id);
  return query select v_link_id, v_share_id;
end; $$;

create or replace function public.update_record_share(p_share_id uuid, p_permission text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_row_id uuid;
begin
  if p_permission not in ('view','edit','admin') then raise exception 'Invalid permission'; end if;
  select row_id into v_row_id from public.record_shares where id = p_share_id and revoked_at is null;
  if v_row_id is null or not private.can_manage_record_share(v_row_id) then raise exception 'Access denied'; end if;
  update public.record_shares set permission = p_permission, updated_at = now() where id = p_share_id;
end; $$;

create or replace function public.revoke_record_share(p_share_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_row_id uuid;
begin
  select row_id into v_row_id from public.record_shares where id = p_share_id and revoked_at is null;
  if v_row_id is null or not private.can_manage_record_share(v_row_id) then raise exception 'Access denied'; end if;
  update public.record_shares set revoked_at = now(), updated_at = now() where id = p_share_id;
end; $$;

create or replace function public.get_shared_record(p_link_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row_id uuid; v_permission text; v_result jsonb;
begin
  select row_id into v_row_id from public.record_share_links where id = p_link_id and revoked_at is null;
  if v_row_id is null then return null; end if;
  if private.can_manage_record_share(v_row_id) then v_permission := 'admin'; else v_permission := private.record_share_level(v_row_id); end if;
  if v_permission is null then raise exception 'Access denied'; end if;
  select jsonb_build_object(
    'permission', v_permission,
    'workspaceName', w.name,
    'databaseName', d.name,
    'row', to_jsonb(r),
    'properties', coalesce((select jsonb_agg(to_jsonb(dp) order by dp.position) from public.database_properties dp where dp.database_id = r.database_id and dp.archived_at is null), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('authorName', p.full_name, 'authorEmail', u.email) order by c.created_at) from public.row_comments c left join public.profiles p on p.id = c.user_id left join auth.users u on u.id = c.user_id where c.row_id = r.id), '[]'::jsonb)
  ) into v_result
  from public.database_rows r join public.workspace_databases d on d.id = r.database_id join public.workspaces w on w.id = r.workspace_id
  where r.id = v_row_id and r.archived_at is null and d.archived_at is null;
  return v_result;
end; $$;

create or replace function public.update_shared_record_value(p_link_id uuid, p_property_id uuid, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row_id uuid; v_database_id uuid; v_permission text; v_row public.database_rows;
begin
  select l.row_id, r.database_id into v_row_id, v_database_id from public.record_share_links l join public.database_rows r on r.id = l.row_id where l.id = p_link_id and l.revoked_at is null and r.archived_at is null;
  if private.can_manage_record_share(v_row_id) then v_permission := 'admin'; else v_permission := private.record_share_level(v_row_id); end if;
  if v_permission not in ('edit','admin') then raise exception 'Access denied'; end if;
  if not exists (select 1 from public.database_properties where id = p_property_id and database_id = v_database_id and archived_at is null) then raise exception 'Invalid property'; end if;
  update public.database_rows set data = case when p_value is null or p_value = 'null'::jsonb or p_value = '""'::jsonb then data - p_property_id::text else jsonb_set(data, array[p_property_id::text], p_value, true) end, updated_by = (select auth.uid()), updated_at = now() where id = v_row_id returning * into v_row;
  return to_jsonb(v_row);
end; $$;

create or replace function public.add_shared_record_comment(p_link_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_row public.database_rows; v_permission text; v_comment public.row_comments;
begin
  select r.* into v_row from public.record_share_links l join public.database_rows r on r.id = l.row_id where l.id = p_link_id and l.revoked_at is null and r.archived_at is null;
  if private.can_manage_record_share(v_row.id) then v_permission := 'admin'; else v_permission := private.record_share_level(v_row.id); end if;
  if v_permission not in ('edit','admin') or nullif(btrim(p_body), '') is null then raise exception 'Access denied'; end if;
  insert into public.row_comments(workspace_id, database_id, row_id, user_id, body) values (v_row.workspace_id, v_row.database_id, v_row.id, (select auth.uid()), left(btrim(p_body), 5000)) returning * into v_comment;
  return to_jsonb(v_comment);
end; $$;

revoke all on function public.ensure_record_share_link(uuid), public.list_record_shares(uuid), public.grant_record_share(uuid,text,text), public.update_record_share(uuid,text), public.revoke_record_share(uuid), public.get_shared_record(uuid), public.update_shared_record_value(uuid,uuid,jsonb), public.add_shared_record_comment(uuid,text) from public;
grant execute on function public.ensure_record_share_link(uuid), public.list_record_shares(uuid), public.grant_record_share(uuid,text,text), public.update_record_share(uuid,text), public.revoke_record_share(uuid), public.get_shared_record(uuid), public.update_shared_record_value(uuid,uuid,jsonb), public.add_shared_record_comment(uuid,text) to authenticated;

commit;
