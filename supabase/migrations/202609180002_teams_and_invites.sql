-- Teams group existing workspace members. They never grant workspace access.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  icon text check (icon is null or char_length(icon) <= 16),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index teams_workspace_name_unique on public.teams (workspace_id, lower(name));
create index teams_workspace_idx on public.teams (workspace_id, created_at);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  workspace_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (workspace_id, user_id) references public.workspace_members(workspace_id, user_id) on delete cascade
);
create index team_members_workspace_user_idx on public.team_members (workspace_id, user_id);

create function private.check_team_membership() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.teams t where t.id = new.team_id and t.workspace_id = new.workspace_id) then
    raise exception 'Team must belong to the same workspace';
  end if;
  return new;
end;
$$;
create trigger check_team_membership before insert or update on public.team_members
for each row execute function private.check_team_membership();

create function private.protect_team_identity() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id or new.created_by is distinct from old.created_by then
    raise exception 'Team identity fields cannot change';
  end if;
  return new;
end;
$$;
create trigger protect_team_identity before update on public.teams
for each row execute function private.protect_team_identity();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
create policy teams_select_member on public.teams for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy teams_insert_admin on public.teams for insert to authenticated
with check (created_by = (select auth.uid()) and private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));
create policy teams_update_admin on public.teams for update to authenticated
using (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));
create policy teams_delete_admin on public.teams for delete to authenticated
using (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));
create policy team_members_select_member on public.team_members for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy team_members_insert_admin on public.team_members for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));
create policy team_members_delete_admin on public.team_members for delete to authenticated
using (private.has_workspace_role(workspace_id, array['OWNER','ADMIN']::public.workspace_role[]));

alter table public.workspace_invites add column intended_team_id uuid references public.teams(id) on delete set null;
alter table public.workspace_invites add column last_sent_at timestamptz not null default now();
alter table public.workspace_invites add column cancelled_at timestamptz;
create index workspace_invites_workspace_status_idx on public.workspace_invites (workspace_id, status, created_at desc);

create or replace function private.protect_invite_client_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if new.workspace_id is distinct from old.workspace_id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.invited_by is distinct from old.invited_by
       or new.invite_token is distinct from old.invite_token
       or new.expires_at is distinct from old.expires_at
       or new.accepted_at is distinct from old.accepted_at
       or new.intended_team_id is distinct from old.intended_team_id
       or new.last_sent_at is distinct from old.last_sent_at
       or old.status <> 'pending'::public.invite_status
       or new.status <> 'cancelled'::public.invite_status then
      raise exception 'Client may only cancel a pending invitation';
    end if;
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

-- Token validation and membership creation share one transaction and lock the invite row.
create function public.accept_workspace_invitation(p_token_hash text)
returns table(workspace_id uuid, workspace_slug text)
language plpgsql security definer set search_path = '' as $$
declare
  v_user auth.users%rowtype;
  v_invite public.workspace_invites%rowtype;
  v_slug text;
begin
  if (select auth.uid()) is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid invitation';
  end if;
  select * into v_user from auth.users where id = (select auth.uid());
  if v_user.id is null or v_user.email_confirmed_at is null then
    raise exception 'Confirm your email before joining';
  end if;
  select * into v_invite from public.workspace_invites where invite_token = p_token_hash for update;
  if v_invite.id is null then raise exception 'Invitation not found'; end if;
  if lower(v_invite.email) <> lower(v_user.email) then raise exception 'This invitation belongs to a different email'; end if;
  if v_invite.status = 'cancelled' then raise exception 'Invitation was cancelled'; end if;
  if v_invite.status = 'accepted' then
    if not exists (select 1 from public.workspace_members where workspace_id = v_invite.workspace_id and user_id = v_user.id) then
      raise exception 'Invitation has already been used';
    end if;
    select slug into v_slug from public.workspaces where id = v_invite.workspace_id;
    if v_slug is null then raise exception 'Workspace no longer exists'; end if;
    return query select v_invite.workspace_id, v_slug;
    return;
  end if;
  if v_invite.status = 'expired' or v_invite.expires_at <= now() then
    raise exception 'Invitation has expired';
  end if;
  if v_invite.status <> 'pending' then raise exception 'Invitation is unavailable'; end if;
  select slug into v_slug from public.workspaces where id = v_invite.workspace_id;
  if v_slug is null then raise exception 'Workspace no longer exists'; end if;
  insert into public.workspace_members(workspace_id, user_id, role, joined_at)
  values (v_invite.workspace_id, v_user.id, v_invite.role, now())
  on conflict (workspace_id, user_id) do nothing;
  if v_invite.intended_team_id is not null then
    insert into public.team_members(team_id, workspace_id, user_id)
    values (v_invite.intended_team_id, v_invite.workspace_id, v_user.id)
    on conflict (team_id, user_id) do nothing;
  end if;
  update public.workspace_invites set status = 'accepted', accepted_at = coalesce(accepted_at, now())
  where id = v_invite.id and status = 'pending';
  return query select v_invite.workspace_id, v_slug;
end;
$$;
revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

create function public.leave_workspace(p_workspace_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_workspace_member(p_workspace_id) then raise exception 'Not a workspace member'; end if;
  if exists (select 1 from public.workspaces where id = p_workspace_id and owner_id = (select auth.uid())) then
    raise exception 'The owner must transfer ownership before leaving';
  end if;
  delete from public.workspace_members where workspace_id = p_workspace_id and user_id = (select auth.uid());
end;
$$;
revoke all on function public.leave_workspace(uuid) from public;
grant execute on function public.leave_workspace(uuid) to authenticated;

create function public.delete_workspace(p_workspace_id uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.workspaces where id = p_workspace_id and owner_id = (select auth.uid()) and name = p_name) then
    raise exception 'Workspace name or permission did not match';
  end if;
  delete from public.workspaces where id = p_workspace_id;
end;
$$;
revoke all on function public.delete_workspace(uuid, text) from public;
grant execute on function public.delete_workspace(uuid, text) to authenticated;
