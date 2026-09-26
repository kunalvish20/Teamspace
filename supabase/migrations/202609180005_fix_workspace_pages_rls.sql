-- Fix circular RLS evaluation on workspace_pages during INSERT ... RETURNING and direct operations.
-- The row itself has workspace_id, visibility, and created_by, so evaluate columns directly on the row
-- instead of querying workspace_pages via private.can_view_page() / can_edit_page().

drop policy if exists workspace_pages_select_allowed on public.workspace_pages;
create policy workspace_pages_select_allowed on public.workspace_pages
for select to authenticated
using (
  private.is_workspace_member(workspace_id)
  and (visibility = 'workspace' or created_by = (select auth.uid()))
);

drop policy if exists workspace_pages_update_allowed on public.workspace_pages;
create policy workspace_pages_update_allowed on public.workspace_pages
for update to authenticated
using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
  and (visibility = 'workspace' or created_by = (select auth.uid()))
)
with check (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
  and (visibility = 'workspace' or created_by = (select auth.uid()))
);

drop policy if exists workspace_pages_delete_allowed on public.workspace_pages;
create policy workspace_pages_delete_allowed on public.workspace_pages
for delete to authenticated
using (
  private.has_workspace_role(workspace_id, array['OWNER','ADMIN','MEMBER']::public.workspace_role[])
  and (visibility = 'workspace' or created_by = (select auth.uid()))
);
