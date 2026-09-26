-- Notion-style pages, blocks, favorites, richer database views, and atomic database creation.

alter type public.database_view_type add value if not exists 'board';
alter type public.database_view_type add value if not exists 'calendar';
alter type public.database_view_type add value if not exists 'gallery';

do $$ begin
  create type public.page_block_type as enum (
    'paragraph','heading_1','heading_2','heading_3','bulleted_list','numbered_list',
    'todo','quote','callout','code','divider'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.workspace_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_page_id uuid,
  title text not null default 'Untitled' check (char_length(title) between 0 and 500),
  icon text,
  cover_url text,
  position numeric not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (parent_page_id, workspace_id)
    references public.workspace_pages(id, workspace_id) on delete cascade
);
create index if not exists workspace_pages_tree_idx
  on public.workspace_pages(workspace_id, parent_page_id, position)
  where archived_at is null;
create index if not exists workspace_pages_title_idx
  on public.workspace_pages(workspace_id, lower(title));

create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  page_id uuid not null,
  block_type public.page_block_type not null default 'paragraph',
  content jsonb not null default '{"text":""}'::jsonb check (jsonb_typeof(content) = 'object'),
  position numeric not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (page_id, workspace_id)
    references public.workspace_pages(id, workspace_id) on delete cascade
);
create index if not exists page_blocks_page_position_idx on public.page_blocks(page_id, position);
create index if not exists page_blocks_workspace_idx on public.page_blocks(workspace_id);

create table if not exists public.page_favorites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  page_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (page_id, user_id),
  foreign key (page_id, workspace_id)
    references public.workspace_pages(id, workspace_id) on delete cascade
);
create index if not exists page_favorites_user_workspace_idx on public.page_favorites(user_id, workspace_id);

create or replace function private.protect_page_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      new.created_by := (select auth.uid());
      new.updated_by := (select auth.uid());
    end if;
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  else
    new.workspace_id := old.workspace_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if (select auth.uid()) is not null then new.updated_by := (select auth.uid()); end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function private.protect_block_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is not null then
      new.created_by := (select auth.uid());
      new.updated_by := (select auth.uid());
    end if;
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  else
    new.workspace_id := old.workspace_id;
    new.page_id := old.page_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if (select auth.uid()) is not null then new.updated_by := (select auth.uid()); end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_pages_audit on public.workspace_pages;
create trigger workspace_pages_audit before insert or update on public.workspace_pages
for each row execute function private.protect_page_audit_fields();

drop trigger if exists page_blocks_audit on public.page_blocks;
create trigger page_blocks_audit before insert or update on public.page_blocks
for each row execute function private.protect_block_audit_fields();

alter table public.workspace_pages enable row level security;
alter table public.page_blocks enable row level security;
alter table public.page_favorites enable row level security;

drop policy if exists workspace_pages_select_member on public.workspace_pages;
create policy workspace_pages_select_member on public.workspace_pages
for select to authenticated using (private.is_workspace_member(workspace_id));

drop policy if exists workspace_pages_insert_writer on public.workspace_pages;
create policy workspace_pages_insert_writer on public.workspace_pages
for insert to authenticated with check (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
);

drop policy if exists workspace_pages_update_writer on public.workspace_pages;
create policy workspace_pages_update_writer on public.workspace_pages
for update to authenticated using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
) with check (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
);

drop policy if exists workspace_pages_delete_admin on public.workspace_pages;
create policy workspace_pages_delete_admin on public.workspace_pages
for delete to authenticated using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])
);

drop policy if exists page_blocks_select_member on public.page_blocks;
create policy page_blocks_select_member on public.page_blocks
for select to authenticated using (private.is_workspace_member(workspace_id));

drop policy if exists page_blocks_insert_writer on public.page_blocks;
create policy page_blocks_insert_writer on public.page_blocks
for insert to authenticated with check (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
);

drop policy if exists page_blocks_update_writer on public.page_blocks;
create policy page_blocks_update_writer on public.page_blocks
for update to authenticated using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
) with check (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
);

drop policy if exists page_blocks_delete_writer on public.page_blocks;
create policy page_blocks_delete_writer on public.page_blocks
for delete to authenticated using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
);

drop policy if exists page_favorites_select_own on public.page_favorites;
create policy page_favorites_select_own on public.page_favorites
for select to authenticated using (
  user_id = (select auth.uid()) and private.is_workspace_member(workspace_id)
);

drop policy if exists page_favorites_insert_own on public.page_favorites;
create policy page_favorites_insert_own on public.page_favorites
for insert to authenticated with check (
  user_id = (select auth.uid()) and private.is_workspace_member(workspace_id)
);

drop policy if exists page_favorites_delete_own on public.page_favorites;
create policy page_favorites_delete_own on public.page_favorites
for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.create_workspace_database(
  p_workspace_id uuid,
  p_name text,
  p_description text default null,
  p_view_type public.database_view_type default 'table'
)
returns table(database_id uuid, view_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_database_id uuid;
  v_view_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.has_workspace_role(p_workspace_id, array['OWNER','ADMIN']::public.workspace_role[]) then
    raise exception 'Only workspace owners and admins can create databases';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Database name is required'; end if;

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

revoke all on function public.create_workspace_database(uuid, text, text, public.database_view_type) from public;
grant execute on function public.create_workspace_database(uuid, text, text, public.database_view_type) to authenticated;

-- Add page and block changes to Realtime once. Duplicate publication membership is ignored.
do $$
begin
  alter publication supabase_realtime add table public.workspace_pages;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.page_blocks;
exception when duplicate_object then null; end $$;

create or replace function public.set_page_archived(p_page_id uuid, p_archived boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_count integer := 0;
begin
  select workspace_id into v_workspace_id from public.workspace_pages where id = p_page_id;
  if v_workspace_id is null then raise exception 'Page not found'; end if;
  if not private.has_workspace_role(v_workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[]) then
    raise exception 'You do not have permission to edit this page';
  end if;

  with recursive descendants as (
    select id from public.workspace_pages where id = p_page_id and workspace_id = v_workspace_id
    union all
    select p.id from public.workspace_pages p
    join descendants d on p.parent_page_id = d.id
    where p.workspace_id = v_workspace_id
  )
  update public.workspace_pages p
  set archived_at = case when p_archived then now() else null end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where p.id in (select id from descendants);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.set_page_archived(uuid, boolean) from public;
grant execute on function public.set_page_archived(uuid, boolean) to authenticated;
