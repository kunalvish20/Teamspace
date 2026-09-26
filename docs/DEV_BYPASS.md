# Development Login Bypass

This project includes a temporary, local-only bypass so the UI can be tested before Supabase Auth/RLS migrations are deployed.

## Enable

In `.env.local`:

```env
VITE_DEV_BYPASS_AUTH=true
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. `/login` and `/signup` redirect to `/app` while the bypass is active.

## What bypass mode does

- Injects a synthetic development user.
- Gives that user `OWNER` UI permissions.
- Creates a local demo workspace named `TeamSpace`.
- Creates a local `Sales CRM` with Main Table, Dashboard, LEAD, 1st Call, Follow Ups, Potential, Closing Pipeline, and Closed Deals views.
- Includes demo members for person/multi-person assignment.
- Supports local row creation/edit/archive, comments, property changes, view filters/sorts/visibility/widths, workspace settings, member role changes, and demo invitations.
- Persists demo data in browser `localStorage` across refreshes.
- Does **not** write bypass-mode data to Supabase.
- Disables Supabase Realtime subscriptions while bypass mode is active.

## Security boundary

The bypass is additionally gated by `import.meta.env.DEV`. Production Vite builds do not activate it, even if the env flag is accidentally left set to `true`.

Supabase RLS and the real Auth flow are unchanged and remain authoritative in normal mode.

## Reset demo data

Clear this browser localStorage key and refresh:

```text
notion-workspace-crm:dev-bypass:v1
```

You can do this from DevTools > Application > Local Storage.

## Remove for final version

Change:

```env
VITE_DEV_BYPASS_AUTH=false
```

or remove the variable entirely.

Then restart Vite. The application immediately returns to real Supabase Auth, workspace membership, RLS, Edge Functions, and Realtime behavior. No UI files need to be rewritten.
