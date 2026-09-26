import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.24.2'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }
const Input = z.object({ token: z.string().min(40).max(200) })
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }) }
async function hash(token: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'Server configuration is incomplete' }, 500)
  let parsed: z.infer<typeof Input>
  try { parsed = Input.parse(await req.json()) } catch { return json({ error: 'Invalid invitation link' }, 400) }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data: invite } = await admin.from('workspace_invites').select('workspace_id,role,status,expires_at,invited_by').eq('invite_token', await hash(parsed.token)).maybeSingle()
  if (!invite) return json({ error: 'This invitation is no longer available.' }, 404)
  const { data: workspace } = await admin.from('workspaces').select('name').eq('id', invite.workspace_id).maybeSingle()
  if (!workspace) return json({ error: 'This workspace is no longer available.' }, 410)
  const { data: inviter } = await admin.from('profiles').select('full_name').eq('id', invite.invited_by).maybeSingle()
  return json({ workspaceName: workspace.name, inviterName: inviter?.full_name ?? null, role: invite.role, available: invite.status === 'pending' && new Date(invite.expires_at).getTime() > Date.now(), status: invite.status, expiresAt: invite.expires_at })
})
