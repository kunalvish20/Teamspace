-- Enable team-scoped resources for workspace_pages and workspace_databases

alter table public.workspace_pages add column if not exists team_id uuid references public.teams(id) on delete set null;
create index if not exists workspace_pages_team_idx on public.workspace_pages(team_id) where team_id is not null;

alter table public.workspace_databases add column if not exists team_id uuid references public.teams(id) on delete set null;
create index if not exists workspace_databases_team_idx on public.workspace_databases(team_id) where team_id is not null;

create or replace function private.can_create_in_team(p_team_id uuid, p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.workspace_id = p_workspace_id
      and (
        exists (select 1 from public.team_members tm where tm.team_id = t.id and tm.user_id = (select auth.uid()))
        or private.has_workspace_role(p_workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
      )
  );
$$;

drop policy if exists workspace_pages_select_allowed on public.workspace_pages;
create policy workspace_pages_select_allowed on public.workspace_pages
for select to authenticated
using (
  private.is_workspace_member(workspace_id)
  and (
    (team_id is not null and (
      exists (select 1 from public.team_members tm where tm.team_id = workspace_pages.team_id and tm.user_id = (select auth.uid()))
      or private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
    ))
    or (team_id is null and (visibility = 'workspace' or created_by = (select auth.uid())))
  )
);

drop policy if exists workspace_pages_update_allowed on public.workspace_pages;
create policy workspace_pages_update_allowed on public.workspace_pages
for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
  and (
    (team_id is not null and (
      exists (select 1 from public.team_members tm where tm.team_id = workspace_pages.team_id and tm.user_id = (select auth.uid()))
      or private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
    ))
    or (team_id is null and (visibility = 'workspace' or created_by = (select auth.uid())))
  )
)
with check (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
  and (
    (team_id is not null and (
      exists (select 1 from public.team_members tm where tm.team_id = workspace_pages.team_id and tm.user_id = (select auth.uid()))
      or private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
    ))
    or (team_id is null and (visibility = 'workspace' or created_by = (select auth.uid())))
  )
);

drop policy if exists workspace_pages_delete_allowed on public.workspace_pages;
create policy workspace_pages_delete_allowed on public.workspace_pages
for delete to authenticated
using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
  and (
    (team_id is not null and (
      exists (select 1 from public.team_members tm where tm.team_id = workspace_pages.team_id and tm.user_id = (select auth.uid()))
      or private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
    ))
    or (team_id is null and (visibility = 'workspace' or created_by = (select auth.uid())))
  )
);

drop policy if exists workspace_pages_insert_writer on public.workspace_pages;
create policy workspace_pages_insert_writer on public.workspace_pages for insert to authenticated
with check (
  (team_id is null and private.can_workspace_action(workspace_id, 'create_page'))
  or (team_id is not null and private.can_create_in_team(team_id, workspace_id))
);

create or replace function private.can_view_page(p_page_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_pages p
    where p.id = p_page_id
      and private.is_workspace_member(p.workspace_id)
      and (
        (p.team_id is not null and (
          exists (select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = (select auth.uid()))
          or private.has_workspace_role(p.workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
        ))
        or (p.team_id is null and (p.visibility = 'workspace' or p.created_by = (select auth.uid())))
      )
  );
$$;

create or replace function private.can_edit_page(p_page_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_pages p
    where p.id = p_page_id
      and private.has_workspace_role(p.workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
      and (
        (p.team_id is not null and (
          exists (select 1 from public.team_members tm where tm.team_id = p.team_id and tm.user_id = (select auth.uid()))
          or private.has_workspace_role(p.workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
        ))
        or (p.team_id is null and (p.visibility = 'workspace' or p.created_by = (select auth.uid())))
      )
  );
$$;

drop policy if exists workspace_databases_select_member on public.workspace_databases;
create policy workspace_databases_select_member on public.workspace_databases
for select to authenticated
using (
  private.is_workspace_member(workspace_id)
  and (
    team_id is null
    or exists (select 1 from public.team_members tm where tm.team_id = workspace_databases.team_id and tm.user_id = (select auth.uid()))
    or private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
  )
);

drop policy if exists workspace_databases_insert_allowed on public.workspace_databases;
create policy workspace_databases_insert_allowed on public.workspace_databases
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (team_id is null and private.can_workspace_action(workspace_id, 'create_collection'))
    or (team_id is not null and private.can_create_in_team(team_id, workspace_id))
  )
);

create or replace function public.create_workspace_database(
  p_workspace_id uuid,
  p_name text,
  p_description text default null,
  p_view_type public.database_view_type default 'table',
  p_team_id uuid default null
)
returns table(database_id uuid, view_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_database_id uuid;
  v_view_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_team_id is not null then
    if not private.can_create_in_team(p_team_id, p_workspace_id) then
      raise exception 'You cannot create a collection in this team';
    end if;
  else
    if not private.can_workspace_action(p_workspace_id, 'create_collection') then
      raise exception 'You cannot create a collection in this workspace';
    end if;
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Collection name is required'; end if;
  insert into public.workspace_databases(workspace_id, team_id, name, description, icon, created_by)
  values (p_workspace_id, p_team_id, left(btrim(p_name), 120), nullif(btrim(coalesce(p_description, '')), ''), 'table', v_user_id)
  returning id into v_database_id;
  insert into public.database_properties(database_id, name, property_type, position, config, is_required)
  values (v_database_id, 'Name', 'title', 0, '{}'::jsonb, true);
  insert into public.database_views(database_id, workspace_id, name, view_type, position, created_by)
  values (v_database_id, p_workspace_id, 'Main view', p_view_type, 0, v_user_id)
  returning id into v_view_id;
  return query select v_database_id, v_view_id;
end;
$$;
