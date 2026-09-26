# Implementation Notes

## Added in this completion pass

- Supabase migration `202609180001_notion_pages_views_collaboration.sql`.
- `workspace_pages`, `page_blocks`, `page_favorites` with RLS and indexes.
- Recursive archive/restore RPC for page trees.
- Atomic database creation RPC.
- Board, calendar and gallery database view enum values.
- Page service, query hooks, editor, page route and trash route.
- Page tree/favorites/search/new workspace/new database functionality in the workspace sidebar.
- Workspace-level Realtime invalidation.
- Bulk invitation support for up to 50 unique emails in one server request.
- Per-email bulk invitation result UI.
- Richer database property creation/configuration.
- Database Table/Board/Calendar/Gallery renderers and view creation UI.
- Workspace logo setting.
- Route lazy-loading and explicit Vite vendor chunks.
- Development bypass store coverage for the new features.

## Before production

1. Run `npm install`.
2. Run `npm run check`.
3. Link the intended Supabase project.
4. Run `supabase db push`.
5. Deploy both Edge Functions.
6. Set `APP_URL` for Edge Functions.
7. Configure Supabase Auth redirects and SMTP.
8. Ensure `VITE_DEV_BYPASS_AUTH=false` in production.
