begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

do $$ begin
  create type public.workspace_role as enum ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.database_property_type as enum (
    'title','text','number','currency','phone','email','date','datetime',
    'select','multi_select','checkbox','person','multi_person','url'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.database_view_type as enum ('table');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'MEMBER' check (role <> 'OWNER'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  -- Stores SHA-256 of the bearer token, never the raw invitation token.
  invite_token text not null unique,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(email) <= 320)
);

create unique index if not exists workspace_invites_one_pending_email
  on public.workspace_invites (workspace_id, lower(email))
  where status = 'pending';

create table if not exists public.workspace_databases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  icon text,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index if not exists workspace_databases_workspace_idx on public.workspace_databases(workspace_id);

create table if not exists public.database_properties (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.workspace_databases(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  property_type public.database_property_type not null,
  position integer not null default 0,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  is_required boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists database_properties_database_position_idx on public.database_properties(database_id, position) where archived_at is null;
create unique index if not exists database_properties_one_title_idx on public.database_properties(database_id) where property_type = 'title' and archived_at is null;

create table if not exists public.database_views (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null,
  workspace_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  view_type public.database_view_type not null default 'table',
  filters jsonb not null default '[]'::jsonb check (jsonb_typeof(filters) = 'array'),
  sorts jsonb not null default '[]'::jsonb check (jsonb_typeof(sorts) = 'array'),
  visible_property_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(visible_property_ids) = 'array'),
  property_widths jsonb not null default '{}'::jsonb check (jsonb_typeof(property_widths) = 'object'),
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (database_id, workspace_id)
    references public.workspace_databases(id, workspace_id) on delete cascade
);
create index if not exists database_views_database_position_idx on public.database_views(database_id, position);
create index if not exists database_views_workspace_idx on public.database_views(workspace_id);

create table if not exists public.database_rows (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null,
  workspace_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  position numeric not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (database_id, workspace_id)
    references public.workspace_databases(id, workspace_id) on delete cascade,
  unique (id, database_id, workspace_id)
);
create index if not exists database_rows_workspace_idx on public.database_rows(workspace_id);
create index if not exists database_rows_database_active_idx on public.database_rows(database_id, position, created_at) where archived_at is null;
create index if not exists database_rows_created_at_idx on public.database_rows(created_at desc);
create index if not exists database_rows_updated_at_idx on public.database_rows(updated_at desc);
create index if not exists database_rows_data_gin_idx on public.database_rows using gin(data jsonb_path_ops);

create table if not exists public.row_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  database_id uuid not null,
  row_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (row_id, database_id, workspace_id)
    references public.database_rows(id, database_id, workspace_id) on delete cascade
);
create index if not exists row_comments_row_created_idx on public.row_comments(row_id, created_at);
create index if not exists row_comments_workspace_idx on public.row_comments(workspace_id);

-- ---------- Common triggers ----------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.protect_workspace_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Workspace ownership transfer is not available in V1';
  end if;
  return new;
end;
$$;

create or replace function private.protect_database_row_audit_fields()
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
    new.database_id := old.database_id;
    new.workspace_id := old.workspace_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if (select auth.uid()) is not null then
      new.updated_by := (select auth.uid());
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function private.protect_title_property()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.property_type = 'title'::public.database_property_type then
    if tg_op = 'DELETE' then
      raise exception 'The primary title property cannot be deleted';
    end if;
    if new.archived_at is not null and old.archived_at is null then
      raise exception 'The primary title property cannot be archived';
    end if;
    if new.property_type <> 'title'::public.database_property_type then
      raise exception 'The primary title property type cannot be changed';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;


create or replace function private.protect_membership_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.workspace_id is distinct from old.workspace_id or new.user_id is distinct from old.user_id or new.joined_at is distinct from old.joined_at then
      raise exception 'Membership identity fields are immutable';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.protect_invite_client_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.workspace_id is distinct from old.workspace_id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.invited_by is distinct from old.invited_by
       or new.invite_token is distinct from old.invite_token
       or new.expires_at is distinct from old.expires_at
       or new.accepted_at is distinct from old.accepted_at
       or old.status <> 'pending'::public.invite_status
       or new.status <> 'cancelled'::public.invite_status then
      raise exception 'Client may only cancel a pending invitation';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.protect_database_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id or new.created_by is distinct from old.created_by then
    raise exception 'Database identity fields are immutable';
  end if;
  return new;
end;
$$;

create or replace function private.protect_property_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.database_id is distinct from old.database_id then raise exception 'Property database is immutable'; end if;
  return new;
end;
$$;

create or replace function private.protect_view_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.database_id is distinct from old.database_id or new.workspace_id is distinct from old.workspace_id or new.created_by is distinct from old.created_by then
    raise exception 'View identity fields are immutable';
  end if;
  return new;
end;
$$;

create or replace function private.protect_comment_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id or new.database_id is distinct from old.database_id or new.row_id is distinct from old.row_id or new.user_id is distinct from old.user_id then
    raise exception 'Comment identity fields are immutable';
  end if;
  return new;
end;
$$;

create or replace function private.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();
  return new;
end;
$$;

-- Drop/recreate auth trigger so migration is idempotent in development.
drop trigger if exists on_auth_user_profile on auth.users;
create trigger on_auth_user_profile
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function private.handle_auth_user_profile();

drop trigger if exists workspace_members_identity on public.workspace_members;
create trigger workspace_members_identity before update on public.workspace_members for each row execute function private.protect_membership_identity();
drop trigger if exists workspace_invites_client_update on public.workspace_invites;
create trigger workspace_invites_client_update before update on public.workspace_invites for each row execute function private.protect_invite_client_update();

drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces for each row execute function private.set_updated_at();
drop trigger if exists workspaces_protect_owner on public.workspaces;
create trigger workspaces_protect_owner before update on public.workspaces for each row execute function private.protect_workspace_owner();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
drop trigger if exists workspace_databases_updated_at on public.workspace_databases;
create trigger workspace_databases_updated_at before update on public.workspace_databases for each row execute function private.set_updated_at();
drop trigger if exists workspace_databases_identity on public.workspace_databases;
create trigger workspace_databases_identity before update on public.workspace_databases for each row execute function private.protect_database_identity();
drop trigger if exists database_properties_updated_at on public.database_properties;
create trigger database_properties_updated_at before update on public.database_properties for each row execute function private.set_updated_at();
drop trigger if exists database_properties_identity on public.database_properties;
create trigger database_properties_identity before update on public.database_properties for each row execute function private.protect_property_identity();
drop trigger if exists database_properties_protect_title on public.database_properties;
create trigger database_properties_protect_title before update or delete on public.database_properties for each row execute function private.protect_title_property();
drop trigger if exists database_views_updated_at on public.database_views;
create trigger database_views_updated_at before update on public.database_views for each row execute function private.set_updated_at();
drop trigger if exists database_views_identity on public.database_views;
create trigger database_views_identity before update on public.database_views for each row execute function private.protect_view_identity();
drop trigger if exists database_rows_audit on public.database_rows;
create trigger database_rows_audit before insert or update on public.database_rows for each row execute function private.protect_database_row_audit_fields();
drop trigger if exists row_comments_updated_at on public.row_comments;
create trigger row_comments_updated_at before update on public.row_comments for each row execute function private.set_updated_at();
drop trigger if exists row_comments_identity on public.row_comments;
create trigger row_comments_identity before update on public.row_comments for each row execute function private.protect_comment_identity();

-- ---------- RLS helper functions ----------
create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_workspace_role(
  p_workspace_id uuid,
  p_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = any(p_roles)
  );
$$;

create or replace function private.shares_workspace_with_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) or exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

create or replace function private.database_workspace_id(p_database_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.workspace_id from public.workspace_databases d where d.id = p_database_id;
$$;

create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- ---------- Atomic first-run workspace + CRM template ----------
create or replace function public.create_workspace(
  p_name text,
  p_slug text default null,
  p_create_default_crm boolean default true
)
returns table(workspace_id uuid, workspace_slug text, database_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid := gen_random_uuid();
  v_database_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 1;
  v_title uuid;
  v_phone uuid;
  v_due_date uuid;
  v_remarks uuid;
  v_status uuid;
  v_source uuid;
  v_revenue uuid;
  v_email uuid;
  v_agreement uuid;
  v_handled_by uuid;
  v_videos uuid;
  v_payments uuid;
  v_company uuid;
  v_assigned uuid;
  v_recording uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Workspace name is required';
  end if;

  v_base_slug := lower(regexp_replace(trim(coalesce(p_slug, p_name)), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if length(v_base_slug) < 3 then
    v_base_slug := 'workspace';
  end if;
  v_base_slug := left(v_base_slug, 55);
  v_slug := v_base_slug;

  while exists (select 1 from public.workspaces w where w.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := left(v_base_slug, 55) || '-' || v_suffix::text;
  end loop;

  insert into public.workspaces(id, name, slug, owner_id)
  values (v_workspace_id, trim(p_name), v_slug, v_user_id);

  insert into public.workspace_members(workspace_id, user_id, role, joined_at)
  values (v_workspace_id, v_user_id, 'OWNER'::public.workspace_role, now());

  if p_create_default_crm then
    insert into public.workspace_databases(workspace_id, name, icon, description, created_by)
    values (v_workspace_id, 'Sales CRM', 'table', 'Shared sales pipeline and lead database', v_user_id)
    returning id into v_database_id;

    v_title := gen_random_uuid();
    v_phone := gen_random_uuid();
    v_due_date := gen_random_uuid();
    v_remarks := gen_random_uuid();
    v_status := gen_random_uuid();
    v_source := gen_random_uuid();
    v_revenue := gen_random_uuid();
    v_email := gen_random_uuid();
    v_agreement := gen_random_uuid();
    v_handled_by := gen_random_uuid();
    v_videos := gen_random_uuid();
    v_payments := gen_random_uuid();
    v_company := gen_random_uuid();
    v_assigned := gen_random_uuid();
    v_recording := gen_random_uuid();

    insert into public.database_properties(id, database_id, name, property_type, position, config, is_required) values
      (v_title, v_database_id, 'Brand Name - POC', 'title', 0, '{}'::jsonb, true),
      (v_phone, v_database_id, 'Phone', 'phone', 1, '{}'::jsonb, false),
      (v_due_date, v_database_id, 'Due Date', 'date', 2, '{}'::jsonb, false),
      (v_remarks, v_database_id, 'Remarks', 'text', 3, '{}'::jsonb, false),
      (v_status, v_database_id, 'Status', 'select', 4,
        jsonb_build_object('options', jsonb_build_array(
          jsonb_build_object('id','lead','label','Lead','color','blue'),
          jsonb_build_object('id','first-call','label','1st Call Scheduled','color','purple'),
          jsonb_build_object('id','follow-up','label','Follow-Up','color','yellow'),
          jsonb_build_object('id','interested','label','Interested','color','green'),
          jsonb_build_object('id','didnt-pick','label','Didn''t Pick','color','gray'),
          jsonb_build_object('id','call-him','label','Call Him','color','orange'),
          jsonb_build_object('id','pdf-sent','label','PDF Sent','color','pink'),
          jsonb_build_object('id','potential','label','Potential','color','teal'),
          jsonb_build_object('id','closing','label','Closing','color','orange'),
          jsonb_build_object('id','closed','label','Closed','color','green')
        )), false),
      (v_source, v_database_id, 'Source', 'select', 5,
        jsonb_build_object('options', jsonb_build_array(
          jsonb_build_object('id','inbound','label','Inbound','color','blue'),
          jsonb_build_object('id','outbound','label','Outbound','color','gray'),
          jsonb_build_object('id','referral','label','Referral','color','green')
        )), false),
      (v_revenue, v_database_id, 'Revenue', 'currency', 6, jsonb_build_object('currency','INR'), false),
      (v_email, v_database_id, 'Email', 'email', 7, '{}'::jsonb, false),
      (v_agreement, v_database_id, 'Agreement Sent', 'checkbox', 8, '{}'::jsonb, false),
      (v_handled_by, v_database_id, 'Handled By', 'person', 9, '{}'::jsonb, false),
      (v_videos, v_database_id, 'No. of Videos', 'number', 10, '{}'::jsonb, false),
      (v_payments, v_database_id, 'Payments', 'currency', 11, jsonb_build_object('currency','INR'), false),
      (v_company, v_database_id, 'Official Company Name', 'text', 12, '{}'::jsonb, false),
      (v_assigned, v_database_id, 'Assigned To', 'multi_person', 13, '{}'::jsonb, false),
      (v_recording, v_database_id, 'Recording Useful', 'checkbox', 14, '{}'::jsonb, false);

    insert into public.database_views(database_id, workspace_id, name, view_type, filters, position, created_by) values
      (v_database_id, v_workspace_id, 'Main Table', 'table', '[]'::jsonb, 0, v_user_id),
      (v_database_id, v_workspace_id, 'LEAD', 'table', jsonb_build_array(jsonb_build_object('propertyId', v_status::text, 'operator', 'equals', 'value', 'lead')), 1, v_user_id),
      (v_database_id, v_workspace_id, '1st Call', 'table', jsonb_build_array(jsonb_build_object('propertyId', v_status::text, 'operator', 'equals', 'value', 'first-call')), 2, v_user_id),
      (v_database_id, v_workspace_id, 'Follow Ups', 'table', jsonb_build_array(jsonb_build_object('propertyId', v_status::text, 'operator', 'equals', 'value', 'follow-up')), 3, v_user_id),
      (v_database_id, v_workspace_id, 'Potential', 'table', jsonb_build_array(jsonb_build_object('propertyId', v_status::text, 'operator', 'equals', 'value', 'potential')), 4, v_user_id),
      (v_database_id, v_workspace_id, 'Closing Pipeline', 'table', jsonb_build_array(jsonb_build_object('propertyId', v_status::text, 'operator', 'equals', 'value', 'closing')), 5, v_user_id),
      (v_database_id, v_workspace_id, 'Closed Deals', 'table', jsonb_build_array(jsonb_build_object('propertyId', v_status::text, 'operator', 'equals', 'value', 'closed')), 6, v_user_id);
  end if;

  return query select v_workspace_id, v_slug, v_database_id;
end;
$$;

revoke all on function public.create_workspace(text, text, boolean) from public;
grant execute on function public.create_workspace(text, text, boolean) to authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_databases enable row level security;
alter table public.database_properties enable row level security;
alter table public.database_views enable row level security;
alter table public.database_rows enable row level security;
alter table public.row_comments enable row level security;

-- Profiles
drop policy if exists profiles_select_shared_workspace on public.profiles;
create policy profiles_select_shared_workspace on public.profiles
for select to authenticated
using ((select private.shares_workspace_with_user(id)));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Workspaces
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
for select to authenticated
using ((select private.is_workspace_member(id)));
drop policy if exists workspaces_update_admin on public.workspaces;
create policy workspaces_update_admin on public.workspaces
for update to authenticated
using ((select private.has_workspace_role(id, array['OWNER','ADMIN']::public.workspace_role[])))
with check ((select private.has_workspace_role(id, array['OWNER','ADMIN']::public.workspace_role[])));

-- Members: reads are shared, role/removal changes are OWNER-only. Direct inserts are intentionally absent.
drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member on public.workspace_members
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
drop policy if exists workspace_members_owner_update on public.workspace_members;
create policy workspace_members_owner_update on public.workspace_members
for update to authenticated
using (
  (select private.has_workspace_role(workspace_id, array['OWNER']::public.workspace_role[]))
  and user_id <> (select owner_id from public.workspaces w where w.id = workspace_id)
)
with check (
  role <> 'OWNER'::public.workspace_role
  and user_id <> (select owner_id from public.workspaces w where w.id = workspace_id)
);
drop policy if exists workspace_members_owner_delete on public.workspace_members;
create policy workspace_members_owner_delete on public.workspace_members
for delete to authenticated
using (
  (select private.has_workspace_role(workspace_id, array['OWNER']::public.workspace_role[]))
  and user_id <> (select owner_id from public.workspaces w where w.id = workspace_id)
);

-- Invites: Edge Functions create/accept; owner/admin can inspect/cancel pending rows.
drop policy if exists workspace_invites_select_admin on public.workspace_invites;
create policy workspace_invites_select_admin on public.workspace_invites
for select to authenticated
using ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])));
drop policy if exists workspace_invites_update_admin on public.workspace_invites;
create policy workspace_invites_update_admin on public.workspace_invites
for update to authenticated
using ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])))
with check (
  (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
  and role <> 'OWNER'::public.workspace_role
);

-- Databases
drop policy if exists workspace_databases_select_member on public.workspace_databases;
create policy workspace_databases_select_member on public.workspace_databases
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
drop policy if exists workspace_databases_insert_admin on public.workspace_databases;
create policy workspace_databases_insert_admin on public.workspace_databases
for insert to authenticated
with check (
  (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
  and created_by = (select auth.uid())
);
drop policy if exists workspace_databases_update_admin on public.workspace_databases;
create policy workspace_databases_update_admin on public.workspace_databases
for update to authenticated
using ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])))
with check ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[])));

-- Properties: members can maintain columns; viewers cannot.
drop policy if exists database_properties_select_member on public.database_properties;
create policy database_properties_select_member on public.database_properties
for select to authenticated
using ((select private.is_workspace_member(private.database_workspace_id(database_id))));
drop policy if exists database_properties_insert_writer on public.database_properties;
create policy database_properties_insert_writer on public.database_properties
for insert to authenticated
with check ((select private.has_workspace_role(private.database_workspace_id(database_id), array['OWNER','ADMIN','MEMBER']::public.workspace_role[])));
drop policy if exists database_properties_update_writer on public.database_properties;
create policy database_properties_update_writer on public.database_properties
for update to authenticated
using ((select private.has_workspace_role(private.database_workspace_id(database_id), array['OWNER','ADMIN','MEMBER']::public.workspace_role[])))
with check ((select private.has_workspace_role(private.database_workspace_id(database_id), array['OWNER','ADMIN','MEMBER']::public.workspace_role[])));

-- Views
drop policy if exists database_views_select_member on public.database_views;
create policy database_views_select_member on public.database_views
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
drop policy if exists database_views_insert_writer on public.database_views;
create policy database_views_insert_writer on public.database_views
for insert to authenticated
with check (
  (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[]))
  and created_by = (select auth.uid())
);
drop policy if exists database_views_update_writer on public.database_views;
create policy database_views_update_writer on public.database_views
for update to authenticated
using ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])))
with check ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])));
drop policy if exists database_views_delete_writer on public.database_views;
create policy database_views_delete_writer on public.database_views
for delete to authenticated
using ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])));

-- Rows: writer roles can insert/update/archive. No hard-delete policy in V1.
drop policy if exists database_rows_select_member on public.database_rows;
create policy database_rows_select_member on public.database_rows
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
drop policy if exists database_rows_insert_writer on public.database_rows;
create policy database_rows_insert_writer on public.database_rows
for insert to authenticated
with check ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])));
drop policy if exists database_rows_update_writer on public.database_rows;
create policy database_rows_update_writer on public.database_rows
for update to authenticated
using ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])))
with check ((select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])));

-- Comments
drop policy if exists row_comments_select_member on public.row_comments;
create policy row_comments_select_member on public.row_comments
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
drop policy if exists row_comments_insert_writer on public.row_comments;
create policy row_comments_insert_writer on public.row_comments
for insert to authenticated
with check (
  (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[]))
  and user_id = (select auth.uid())
);
drop policy if exists row_comments_update_own_or_admin on public.row_comments;
create policy row_comments_update_own_or_admin on public.row_comments
for update to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
)
with check (
  user_id = (select auth.uid())
  or (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
);
drop policy if exists row_comments_delete_own_or_admin on public.row_comments;
create policy row_comments_delete_own_or_admin on public.row_comments
for delete to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
);

-- ---------- Storage ----------
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-assets', 'workspace-assets', false, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists workspace_assets_select on storage.objects;
create policy workspace_assets_select on storage.objects
for select to authenticated
using (
  bucket_id = 'workspace-assets'
  and (select private.is_workspace_member(private.try_uuid((storage.foldername(name))[1])))
);
drop policy if exists workspace_assets_insert on storage.objects;
create policy workspace_assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'workspace-assets'
  and (select private.has_workspace_role(private.try_uuid((storage.foldername(name))[1]), array['OWNER','ADMIN','MEMBER']::public.workspace_role[]))
);
drop policy if exists workspace_assets_update on storage.objects;
create policy workspace_assets_update on storage.objects
for update to authenticated
using (
  bucket_id = 'workspace-assets'
  and (select private.has_workspace_role(private.try_uuid((storage.foldername(name))[1]), array['OWNER','ADMIN','MEMBER']::public.workspace_role[]))
)
with check (
  bucket_id = 'workspace-assets'
  and (select private.has_workspace_role(private.try_uuid((storage.foldername(name))[1]), array['OWNER','ADMIN','MEMBER']::public.workspace_role[]))
);
drop policy if exists workspace_assets_delete on storage.objects;
create policy workspace_assets_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'workspace-assets'
  and (select private.has_workspace_role(private.try_uuid((storage.foldername(name))[1]), array['OWNER','ADMIN']::public.workspace_role[]))
);

-- ---------- Function/schema privileges ----------
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function private.shares_workspace_with_user(uuid) to authenticated;
grant execute on function private.database_workspace_id(uuid) to authenticated;
grant execute on function private.try_uuid(text) to authenticated;

-- Realtime: one database_rows stream, filtered by database/workspace in clients.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'database_rows'
  ) then
    alter publication supabase_realtime add table public.database_rows;
  end if;
end $$;

commit;
