create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  who_can_invite text not null default 'admins' check (who_can_invite in ('admins', 'everyone')),
  who_can_create_team text not null default 'admins' check (who_can_create_team in ('admins', 'everyone')),
  who_can_create_collection text not null default 'admins' check (who_can_create_collection in ('admins', 'everyone')),
  who_can_create_page text not null default 'everyone' check (who_can_create_page in ('admins', 'everyone')),
  updated_at timestamptz not null default now()
);
insert into public.workspace_settings(workspace_id) select id from public.workspaces on conflict do nothing;
create function private.create_workspace_settings() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_settings(workspace_id) values (new.id);
  return new;
end;
$$;
create trigger create_workspace_settings after insert on public.workspaces for each row execute function private.create_workspace_settings();

alter table public.workspace_settings enable row level security;
create policy workspace_settings_select_member on public.workspace_settings for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy workspace_settings_update_admin on public.workspace_settings for update to authenticated
using (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));

create function private.can_workspace_action(p_workspace_id uuid, p_action text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    join public.workspace_settings s on s.workspace_id = m.workspace_id
    where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid())
      and m.role in ('OWNER','ADMIN','MEMBER')
      and (m.role in ('OWNER','ADMIN') or case p_action
        when 'invite' then s.who_can_invite = 'everyone'
        when 'create_team' then s.who_can_create_team = 'everyone'
        when 'create_collection' then s.who_can_create_collection = 'everyone'
        when 'create_page' then s.who_can_create_page = 'everyone'
        else false end)
  );
$$;

-- Creation permissions are enforced in the database as well as in the UI.
drop policy if exists workspace_pages_insert_writer on public.workspace_pages;
create policy workspace_pages_insert_writer on public.workspace_pages for insert to authenticated
with check (private.can_workspace_action(workspace_id, 'create_page'));
drop policy if exists teams_insert_admin on public.teams;
create policy teams_insert_allowed on public.teams for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_workspace_action(workspace_id, 'create_team'));
drop policy if exists workspace_databases_insert_admin on public.workspace_databases;
create policy workspace_databases_insert_allowed on public.workspace_databases for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_workspace_action(workspace_id, 'create_collection'));
drop policy if exists workspace_invites_select_admin on public.workspace_invites;
create policy workspace_invites_select_allowed on public.workspace_invites for select to authenticated
using (private.can_workspace_action(workspace_id, 'invite'));
drop policy if exists workspace_invites_update_admin on public.workspace_invites;
create policy workspace_invites_update_allowed on public.workspace_invites for update to authenticated
using (private.can_workspace_action(workspace_id, 'invite'))
with check (private.can_workspace_action(workspace_id, 'invite') and role <> 'OWNER'::public.workspace_role);

create or replace function public.create_workspace_database(
  p_workspace_id uuid,
  p_name text,
  p_description text default null,
  p_view_type public.database_view_type default 'table'
)
returns table(database_id uuid, view_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_database_id uuid;
  v_view_id uuid;
begin
  if v_user_id is null or not private.can_workspace_action(p_workspace_id, 'create_collection') then
    raise exception 'You cannot create a collection in this workspace';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Collection name is required'; end if;
  insert into public.workspace_databases(workspace_id, name, description, icon, created_by)
  values (p_workspace_id, left(btrim(p_name), 120), nullif(btrim(coalesce(p_description, '')), ''), 'table', v_user_id)
  returning id into v_database_id;
  insert into public.database_properties(database_id, name, property_type, position, config, is_required)
  values (v_database_id, 'Name', 'title', 0, '{}'::jsonb, true);
  insert into public.database_views(database_id, workspace_id, name, view_type, position, created_by)
  values (v_database_id, p_workspace_id, 'Main view', p_view_type, 0, v_user_id)
  returning id into v_view_id;
  return query select v_database_id, v_view_id;
end;
$$;

create policy workspace_databases_delete_admin on public.workspace_databases for delete to authenticated
using (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));

create function private.can_manage_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and private.is_workspace_member(t.workspace_id)
      and (t.created_by = (select auth.uid()) or private.has_workspace_role(t.workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
  );
$$;
drop policy if exists teams_update_admin on public.teams;
create policy teams_update_manager on public.teams for update to authenticated
using (private.can_manage_team(id)) with check (private.can_manage_team(id));
drop policy if exists teams_delete_admin on public.teams;
create policy teams_delete_manager on public.teams for delete to authenticated
using (private.can_manage_team(id));
drop policy if exists team_members_insert_admin on public.team_members;
create policy team_members_insert_manager on public.team_members for insert to authenticated
with check (private.can_manage_team(team_id));
drop policy if exists team_members_delete_admin on public.team_members;
create policy team_members_delete_manager on public.team_members for delete to authenticated
using (private.can_manage_team(team_id));

do $$ begin alter publication supabase_realtime add table public.teams; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.team_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.workspace_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.workspace_invites; exception when duplicate_object then null; end $$;
