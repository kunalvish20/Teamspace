begin;

-- Effective permission for a shared-collection link. Returns null when the link
-- is revoked/unknown or the caller has no access at all.
create or replace function private.collection_share_permission(p_link_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_database_id uuid;
begin
  select database_id into v_database_id
  from public.collection_share_links
  where id = p_link_id and revoked_at is null;
  if v_database_id is null then return null; end if;
  if private.can_manage_collection_share(v_database_id) then return 'admin'; end if;
  return private.collection_share_level(v_database_id);
end; $$;

create or replace function private.can_write_shared_collection(p_link_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.collection_share_permission(p_link_id) in ('edit', 'admin');
$$;

-- Add a record to a shared collection. Allowed for edit and admin.
create or replace function public.create_shared_collection_row(p_link_id uuid, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid; v_row public.database_rows;
begin
  select database_id into v_database_id
  from public.collection_share_links
  where id = p_link_id and revoked_at is null;
  if v_database_id is null then raise exception 'Link not found'; end if;
  if not private.can_write_shared_collection(p_link_id) then raise exception 'Access denied'; end if;

  insert into public.database_rows(database_id, workspace_id, created_by, updated_by, data, position)
  select d.id, d.workspace_id, (select auth.uid()), (select auth.uid()),
         case when jsonb_typeof(p_data) = 'object' then p_data else '{}'::jsonb end,
         coalesce((select max(r.position) + 1 from public.database_rows r where r.database_id = d.id), 0)
  from public.workspace_databases d
  where d.id = v_database_id and d.archived_at is null
  returning * into v_row;
  if v_row.id is null then raise exception 'Collection not found'; end if;
  return to_jsonb(v_row);
end; $$;

-- Archive a record inside a shared collection. Soft delete, restorable by the owner.
create or replace function public.archive_shared_collection_row(p_link_id uuid, p_row_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid; v_row public.database_rows;
begin
  select database_id into v_database_id
  from public.collection_share_links
  where id = p_link_id and revoked_at is null;
  if v_database_id is null then raise exception 'Link not found'; end if;
  if not private.can_write_shared_collection(p_link_id) then raise exception 'Access denied'; end if;

  update public.database_rows
  set archived_at = now(), updated_by = (select auth.uid()), updated_at = now()
  where id = p_row_id and database_id = v_database_id and archived_at is null
  returning * into v_row;
  if v_row.id is null then raise exception 'Record not found'; end if;
  return to_jsonb(v_row);
end; $$;

-- Persist column widths for shared viewers so layout is not lost on reload.
-- Only property_widths is writable; names, filters and schema stay owner-managed.
create or replace function public.update_shared_collection_view_layout(p_link_id uuid, p_view_id uuid, p_property_widths jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_database_id uuid; v_view public.database_views;
begin
  select database_id into v_database_id
  from public.collection_share_links
  where id = p_link_id and revoked_at is null;
  if v_database_id is null then raise exception 'Link not found'; end if;
  if not private.can_write_shared_collection(p_link_id) then raise exception 'Access denied'; end if;

  update public.database_views
  set property_widths = case when jsonb_typeof(p_property_widths) = 'object' then p_property_widths else '{}'::jsonb end,
      updated_at = now()
  where id = p_view_id and database_id = v_database_id
  returning * into v_view;
  if v_view.id is null then raise exception 'View not found'; end if;
  return to_jsonb(v_view);
end; $$;

revoke all on function public.create_shared_collection_row(uuid, jsonb), public.archive_shared_collection_row(uuid, uuid), public.update_shared_collection_view_layout(uuid, uuid, jsonb) from public;
grant execute on function public.create_shared_collection_row(uuid, jsonb), public.archive_shared_collection_row(uuid, uuid), public.update_shared_collection_view_layout(uuid, uuid, jsonb) to authenticated;

commit;
