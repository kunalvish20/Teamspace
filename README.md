# Workspace OS — Notion-style collaborative workspace + databases

A production-oriented collaborative workspace built with React, TypeScript, Vite, Supabase, PostgreSQL/RLS, Supabase Realtime/Auth, TanStack Query/Table, React Router and Tailwind CSS.

This repository includes a complete runnable application source, Supabase migrations, Edge Functions, development bypass data, and deployment configuration.

## Included functionality

### Workspaces and collaboration

- Email/password Supabase authentication, password reset and protected application routes.
- Multiple workspaces per account with a workspace switcher.
- Create additional workspaces from the sidebar.
- Workspace roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`.
- Workspace name and logo customization.
- Members page with role management and removal.
- Bulk invite UI: paste/enter up to **50 unique emails in one action**.
- Bulk invite Edge Function validates each address and returns per-email success/failure.
- Secure invitation acceptance with hashed bearer invite tokens and expiry.
- Tenant isolation enforced with PostgreSQL RLS, not frontend-only checks.

### Notion-style pages

- First-class pages stored separately from database rows.
- Nested pages/sub-pages.
- Page icons and optional cover URL support.
- Page title autosave.
- Favorites per user.
- Sidebar page tree and page search.
- Trash, recursive restore and permanent delete.
- Block-level Realtime refresh across workspace clients.
- Block editor supports:
  - paragraph
  - heading 1/2/3
  - bulleted list
  - numbered list
  - to-do
  - quote
  - callout
  - code
  - divider
- Block autosave, add/delete and reordering.
- VIEWER users get read-only page/database access.

### Databases

- Create databases from the sidebar using an atomic Supabase RPC.
- Dynamic properties stored as metadata; row data is JSONB keyed by immutable property UUID.
- Property types:
  - title
  - text
  - number
  - currency
  - phone
  - email
  - URL
  - date
  - date/time
  - select
  - multi-select
  - checkbox
  - person
  - people
- Configure select/multi-select options and currency.
- Rename/reorder/archive properties.
- Search, filters, sorts, property visibility and column sizing.
- Inline editing and optimistic row updates.
- Record detail panel and row comments.
- Soft archive for rows.
- Pagination in pages of 100.
- Database Realtime subscription.
- Views:
  - Table
  - Board
  - Calendar
  - Gallery
  - Dashboard
- Create additional views from the database UI.
- CRM dashboard aggregate RPC.

### Performance work

- Route-level `React.lazy` code splitting.
- Vite vendor chunk splitting for React, TanStack and Supabase.
- React Query caching and invalidation scoped by workspace/database/page.
- Debounced database search.
- Debounced page/block autosave.
- Server-side paginated row query/search.
- One Realtime channel per open database and one per active workspace rather than per cell.
- Database indexes for active rows, page trees, page blocks and favorites.

## Important scope note

This is a complete implementation of the application in this repository and the major Notion-style workspace requirements above. It is not a claim of byte-for-byte feature parity with Notion's entire commercial platform. Notion has additional proprietary systems such as CRDT collaborative cursors, advanced formulas/rollups/relations, public publishing, enterprise SSO/SCIM, AI, marketplace integrations and other services that would be separate product work.

## Project structure

```text
src/
  app/
  components/
    database/
    members/
    pages/
    ui/
    workspace/
  features/
    auth/
    database/
    pages/
    workspace/
  hooks/
  lib/
  pages/
  services/
  types/
  utils/

supabase/
  migrations/
    202608270001_initial_workspace_crm.sql
    202608270002_dev_seed.sql
    202608270003_dashboard_metrics.sql
    202608270004_query_rows.sql
    202609180001_notion_pages_views_collaboration.sql
  functions/
    invite-workspace-member/
    accept-workspace-invite/
```

## Environment

Copy `.env.example` to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
VITE_APP_URL=http://localhost:5173
VITE_DEV_BYPASS_AUTH=false
```

`VITE_DEV_BYPASS_AUTH=true` works only in Vite development mode and is intentionally disabled by production builds.

Server-only Edge Function secrets are documented in `supabase/.env.example`. Never put Supabase service/secret keys in a `VITE_` variable.

## Install and run

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Supabase setup

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy invite-workspace-member
supabase functions deploy accept-workspace-invite
supabase secrets set APP_URL=https://YOUR_DOMAIN
```

Add these redirect URLs in Supabase Auth URL configuration:

```text
http://localhost:5173/invite/**
http://localhost:5173/reset-password
https://YOUR_DOMAIN/invite/**
https://YOUR_DOMAIN/reset-password
```

Configure a production SMTP provider in Supabase Auth before depending on workspace invitations.

## Bulk member invitation behavior

OWNER/ADMIN can paste up to 50 addresses. The frontend de-duplicates and validates the list, then sends one request to `invite-workspace-member`.

The Edge Function:

1. authenticates the caller;
2. verifies OWNER/ADMIN membership;
3. checks existing workspace membership for each email;
4. checks active pending invitations;
5. stores only a SHA-256 hash of each workspace invite token;
6. sends Supabase Auth invite/magic-link mail;
7. returns a result for every email.

There is no application-level 50-member workspace cap. The `50` limit is only the maximum batch size per invite action.

## Security model

- Workspace access is enforced with PostgreSQL RLS.
- Browser code never receives the Supabase service/secret key.
- Cross-workspace parent-page, block, favorite, database-view, row and comment references are constrained in PostgreSQL.
- VIEWER cannot mutate pages, blocks, databases or rows.
- OWNER/ADMIN manage workspace settings/invites.
- Only OWNER can change member roles/remove members in the existing role model.
- Page archive/restore recursively applies to descendants through a database RPC.

## Verification in this generated package

The environment used to prepare this archive could not complete `npm install` because registry access timed out, so the real dependency-backed Vite build could not be executed here.

The source was nevertheless checked with the installed TypeScript compiler using temporary module shims matching the project imports, with `strict` + `noUncheckedIndexedAccess`, and all TS/TSX files passed. A separate syntax/transpile pass and relative-import existence check also passed. Run `npm run check` after dependency installation on your machine/CI before deploying.
