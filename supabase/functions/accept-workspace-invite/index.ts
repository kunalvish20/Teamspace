import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.24.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const Input = z.object({ token: z.string().min(40).max(200) })
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
async function sha256(value: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!url || !anonKey) return json({ error: 'Server configuration is incomplete' }, 500)
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData.user?.email) return json({ error: 'Invalid session' }, 401)
  let parsed: z.infer<typeof Input>
  try { parsed = Input.parse(await req.json()) } catch { return json({ error: 'Invalid invitation token' }, 400) }
  const { data, error } = await caller.rpc('accept_workspace_invitation', { p_token_hash: await sha256(parsed.token) })
  if (error) {
    const message = error.message
    if (message.includes('different email')) return json({ error: 'Sign in with the email address that received this invitation.' }, 403)
    if (message.includes('Confirm your email')) return json({ error: 'Confirm your email before joining.' }, 403)
    if (message.includes('expired') || message.includes('cancelled')) return json({ error: 'This invitation is no longer available.' }, 410)
    return json({ error: 'Could not join the workspace. Please try again.' }, 400)
  }
  const workspace = data?.[0]
  if (!workspace) return json({ error: 'Invitation is no longer available.' }, 410)
  await caller.auth.updateUser({ data: { workspace_invite: false } })
  return json({ ok: true, workspaceId: workspace.workspace_id, workspaceSlug: workspace.workspace_slug })
})
