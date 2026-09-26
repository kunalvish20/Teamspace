-- Preserve access to existing pages; new pages are private by default.
alter table public.workspace_pages add column visibility text not null default 'workspace'
  check (visibility in ('private', 'workspace'));
alter table public.workspace_pages alter column visibility set default 'private';

create function private.can_view_page(p_page_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_pages p
    where p.id = p_page_id
      and private.is_workspace_member(p.workspace_id)
      and (p.visibility = 'workspace' or p.created_by = (select auth.uid()))
  );
$$;
create function private.can_edit_page(p_page_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_pages p
    where p.id = p_page_id
      and private.has_workspace_role(p.workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
      and (p.visibility = 'workspace' or p.created_by = (select auth.uid()))
  );
$$;

create function private.protect_page_visibility() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.visibility is distinct from old.visibility and old.created_by <> (select auth.uid()) then
    raise exception 'Only the page creator can change visibility';
  end if;
  return new;
end;
$$;
create trigger protect_page_visibility before update on public.workspace_pages
for each row execute function private.protect_page_visibility();

drop policy if exists workspace_pages_select_member on public.workspace_pages;
create policy workspace_pages_select_allowed on public.workspace_pages for select to authenticated
using (private.can_view_page(id));
drop policy if exists workspace_pages_update_writer on public.workspace_pages;
create policy workspace_pages_update_allowed on public.workspace_pages for update to authenticated
using (private.can_edit_page(id)) with check (private.can_edit_page(id));
drop policy if exists workspace_pages_delete_admin on public.workspace_pages;
create policy workspace_pages_delete_allowed on public.workspace_pages for delete to authenticated
using (private.can_edit_page(id));

drop policy if exists page_blocks_select_member on public.page_blocks;
create policy page_blocks_select_allowed on public.page_blocks for select to authenticated
using (private.can_view_page(page_id));
drop policy if exists page_blocks_insert_writer on public.page_blocks;
create policy page_blocks_insert_allowed on public.page_blocks for insert to authenticated
with check (private.can_edit_page(page_id));
drop policy if exists page_blocks_update_writer on public.page_blocks;
create policy page_blocks_update_allowed on public.page_blocks for update to authenticated
using (private.can_edit_page(page_id)) with check (private.can_edit_page(page_id));
drop policy if exists page_blocks_delete_writer on public.page_blocks;
create policy page_blocks_delete_allowed on public.page_blocks for delete to authenticated
using (private.can_edit_page(page_id));
drop policy if exists page_favorites_select_own on public.page_favorites;
create policy page_favorites_select_own_visible on public.page_favorites for select to authenticated
using (user_id = (select auth.uid()) and private.can_view_page(page_id));
drop policy if exists page_favorites_insert_own on public.page_favorites;
create policy page_favorites_insert_own_visible on public.page_favorites for insert to authenticated
with check (user_id = (select auth.uid()) and private.can_view_page(page_id));

create or replace function public.set_page_archived(p_page_id uuid, p_archived boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_workspace_id uuid;
  v_count integer := 0;
begin
  select workspace_id into v_workspace_id from public.workspace_pages where id = p_page_id;
  if v_workspace_id is null or not private.can_edit_page(p_page_id) then
    raise exception 'You do not have permission to edit this page';
  end if;
  with recursive descendants as (
    select id from public.workspace_pages where id = p_page_id and workspace_id = v_workspace_id
    union all
    select p.id from public.workspace_pages p join descendants d on p.parent_page_id = d.id
    where p.workspace_id = v_workspace_id
  )
  update public.workspace_pages p
  set archived_at = case when p_archived then now() else null end,
      updated_by = (select auth.uid()), updated_at = now()
  where p.id in (select id from descendants) and private.can_edit_page(p.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
