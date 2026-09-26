# Multi-User / RLS Security Test Matrix

Run this against the real linked Supabase project before production release.

## Test identities

Create four normal Auth users through supported Auth flows:

- User A: OWNER of Workspace A
- User B: MEMBER of Workspace A
- User C: VIEWER of Workspace A
- User D: OWNER/MEMBER of separate Workspace B only

Use separate browser profiles/incognito sessions so each request carries a real distinct user JWT. Do **not** test by using the secret/service key; it intentionally bypasses RLS.

## Membership and invitations

- [ ] User A can invite User B as MEMBER.
- [ ] User B receives the invitation and can accept after authentication.
- [ ] Re-opening the same accepted invite is idempotent and does not create a duplicate membership.
- [ ] Duplicate active invite for the same workspace/email is rejected.
- [ ] Expired invite is rejected.
- [ ] Invite opened while signed in as a different email is rejected.
- [ ] User B cannot INSERT directly into `workspace_members` through Supabase REST/client.
- [ ] User B cannot UPDATE their own role to OWNER/ADMIN.
- [ ] User C cannot update any membership.
- [ ] ADMIN can invite but cannot change roles/remove members.
- [ ] OWNER cannot be demoted or removed through the normal member update/delete path.
- [ ] No client update can rewrite invite email/token/role/expiry; only cancellation is allowed.

## Workspace isolation

Capture real UUIDs for Workspace A database/rows/comments, then deliberately call Supabase from User D's browser console/client using those UUIDs.

- [ ] User D cannot SELECT Workspace A from `workspaces`.
- [ ] User D cannot SELECT Workspace A `workspace_members`.
- [ ] User D cannot SELECT Workspace A `workspace_databases`.
- [ ] User D cannot SELECT Workspace A `database_properties`.
- [ ] User D cannot SELECT Workspace A `database_views`.
- [ ] User D cannot SELECT Workspace A `database_rows` even with exact record UUID.
- [ ] User D cannot SELECT Workspace A `row_comments`.
- [ ] User D cannot call dashboard/query RPCs to retrieve Workspace A row data because those functions are `SECURITY INVOKER` and RLS remains active.

## Cross-ID tampering

- [ ] User B cannot insert a row with `workspace_id = Workspace A` and `database_id = Workspace B database`; composite FK rejects it.
- [ ] User B cannot UPDATE an existing row's `workspace_id` or `database_id`; audit/identity trigger keeps them immutable.
- [ ] A comment cannot reference a row/database/workspace tuple that does not belong together.
- [ ] Membership `workspace_id`, `user_id`, and `joined_at` cannot be rewritten through a browser update.
- [ ] Database `workspace_id`/`created_by`, property `database_id`, view identity, and comment identity fields cannot be moved through browser updates.

## Role behavior

### OWNER
- [ ] Can create/edit/archive rows.
- [ ] Can create/rename/reorder/archive non-title properties.
- [ ] Cannot archive/delete/change type of primary title property.
- [ ] Can edit views/filters/sorts/visibility.
- [ ] Can invite and manage roles/remove non-owner members.

### MEMBER
- [ ] Can read workspace and member list.
- [ ] Can create/edit/archive CRM rows.
- [ ] Can add comments.
- [ ] Can assign only users returned from the current workspace member list.
- [ ] Cannot edit workspace general/security settings.
- [ ] Cannot invite/change/remove members.

### VIEWER
- [ ] Can read database rows/properties/views/comments.
- [ ] Cannot INSERT/UPDATE/archive rows even if UI restrictions are bypassed.
- [ ] Cannot add comments.
- [ ] Cannot edit view/property state.

## Realtime

Open the same database as User A and User B.

- [ ] User B inserts a row; User A sees it without manual refresh.
- [ ] User B edits a cell; User A sees the updated row without duplicate rows.
- [ ] Change a record status from Lead to Follow-Up while User A is on LEAD view; it disappears after cache reconciliation.
- [ ] The same record appears in Follow Ups view.
- [ ] Archive a row; it disappears for other connected members.
- [ ] User D, who is outside Workspace A, does not receive/read Workspace A row changes.

## Persistence / refresh

- [ ] Inline cell values persist after full browser refresh.
- [ ] Person/multi-person assignments persist.
- [ ] View filters/sorts/property visibility/column widths persist.
- [ ] Comments persist.
- [ ] Auth session persists according to Supabase Auth configuration.

## Scale smoke test

- [ ] Seed/import at least 5,000 CRM records.
- [ ] Initial table still fetches only 100 rows.
- [ ] Load-more adds the next page rather than refetching the entire dataset.
- [ ] Server search finds matching string-like values beyond the first page.
- [ ] Status equality views are filtered server-side.
- [ ] No request is emitted per keystroke for cell text editing; text persists on blur/Enter.
- [ ] Only one database-row Realtime channel exists per open database page, not per cell.
