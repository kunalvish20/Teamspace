import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.24.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const Email = z.string().email().max(320).transform((value) => value.trim().toLowerCase())
const Input = z.object({
  action: z.enum(['send', 'resend']).default('send'),
  workspaceId: z.string().uuid(),
  email: Email.optional(),
  emails: z.array(Email).min(1).max(50).optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  intendedTeamId: z.string().uuid().optional(),
  inviteId: z.string().uuid().optional(),
}).refine((value) => value.action === 'resend' ? Boolean(value.inviteId) : Boolean(value.email || value.emails?.length), { message: 'An email or invitation is required' })

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const appUrl = Deno.env.get('APP_URL')
  const authHeader = req.headers.get('Authorization')
  if (!url || !anonKey || !secretKey || !appUrl) return json({ error: 'Server configuration is incomplete' }, 500)
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Invalid session' }, 401)

  let parsed: z.infer<typeof Input>
  try { parsed = Input.parse(await req.json()) } catch { return json({ error: 'Invalid invitation payload' }, 400) }

  const { data: callerMembership, error: membershipError } = await caller
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', parsed.workspaceId)
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (membershipError || !callerMembership) return json({ error: 'You are not allowed to invite workspace members' }, 403)
  if (!['OWNER', 'ADMIN'].includes(callerMembership.role)) {
    const { data: settings } = await caller.from('workspace_settings').select('who_can_invite').eq('workspace_id', parsed.workspaceId).single()
    if (callerMembership.role !== 'MEMBER' || settings?.who_can_invite !== 'everyone') return json({ error: 'You are not allowed to invite workspace members' }, 403)
  }

  if (parsed.action === 'resend') {
    const { data: invite } = await admin.from('workspace_invites').select('*').eq('id', parsed.inviteId).eq('workspace_id', parsed.workspaceId).eq('status', 'pending').maybeSingle()
    if (!invite) return json({ error: 'Invitation is no longer pending' }, 404)
    if (Date.now() - new Date(invite.last_sent_at).getTime() < 2 * 60 * 1000) return json({ error: 'Wait two minutes before resending this invitation' }, 429)
    const rawToken = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`
    const tokenHash = await sha256(rawToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: profile } = await admin.from('profiles').select('id').eq('email', invite.email).maybeSingle()
    const redirectTo = `${appUrl.replace(/\/$/, '')}/invite/${encodeURIComponent(rawToken)}`
    const { data: reserved, error: reserveError } = await admin.from('workspace_invites').update({ invite_token: tokenHash, expires_at: expiresAt, last_sent_at: new Date().toISOString() }).eq('id', invite.id).eq('status', 'pending').eq('last_sent_at', invite.last_sent_at).select('id').maybeSingle()
    if (reserveError || !reserved) return json({ error: 'This invitation was just resent. Try again later.' }, 429)
    const sendError = profile
      ? (await createClient(url, anonKey, { auth: { persistSession: false } }).auth.signInWithOtp({ email: invite.email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } })).error
      : (await admin.auth.admin.inviteUserByEmail(invite.email, { redirectTo, data: { workspace_invite: true } })).error
    if (sendError) {
      await admin.from('workspace_invites').update({ invite_token: invite.invite_token, expires_at: invite.expires_at, last_sent_at: invite.last_sent_at }).eq('id', invite.id).eq('invite_token', tokenHash)
      return json({ error: 'We could not resend the invitation. Try again.' }, 502)
    }
    return json({ ok: true })
  }

  if (parsed.intendedTeamId) {
    const { data: team } = await admin.from('teams').select('id').eq('id', parsed.intendedTeamId).eq('workspace_id', parsed.workspaceId).maybeSingle()
    if (!team) return json({ error: 'Choose a team from this workspace' }, 400)
  }

  const uniqueEmails = [...new Set([...(parsed.emails ?? []), ...(parsed.email ? [parsed.email] : [])])].slice(0, 50)
  const { data: profiles, error: profilesError } = await admin.from('profiles').select('id,email').in('email', uniqueEmails)
  if (profilesError) return json({ error: 'Could not validate invitees' }, 500)
  const usersByEmail = new Map((profiles ?? []).flatMap((profile) => profile.email ? [[profile.email.toLowerCase(), profile] as const] : []))
  const results: Array<{ email: string; ok: boolean; inviteId?: string; error?: string }> = []

  for (const email of uniqueEmails) {
    try {
      const existingUser = usersByEmail.get(email)
      if (existingUser) {
        const { data: existingMembership } = await admin.from('workspace_members').select('id').eq('workspace_id', parsed.workspaceId).eq('user_id', existingUser.id).maybeSingle()
        if (existingMembership) {
          results.push({ email, ok: false, error: 'Already a workspace member' })
          continue
        }
      }

      const { data: pending } = await admin.from('workspace_invites').select('id,expires_at').eq('workspace_id', parsed.workspaceId).eq('email', email).eq('status', 'pending').maybeSingle()
      if (pending && new Date(pending.expires_at).getTime() > Date.now()) {
        results.push({ email, ok: false, error: 'Active invitation already exists' })
        continue
      }
      if (pending) await admin.from('workspace_invites').update({ status: 'expired' }).eq('id', pending.id)

      const rawToken = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`
      const tokenHash = await sha256(rawToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: invite, error: inviteError } = await admin.from('workspace_invites').insert({
        workspace_id: parsed.workspaceId,
        email,
        role: parsed.role,
        invited_by: userData.user.id,
        invite_token: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
        intended_team_id: parsed.intendedTeamId ?? null,
      }).select('id').single()
      if (inviteError || !invite) {
        results.push({ email, ok: false, error: 'Could not create invitation' })
        continue
      }

      const redirectTo = `${appUrl.replace(/\/$/, '')}/invite/${encodeURIComponent(rawToken)}`
      let sendError: Error | null = null
      if (existingUser) {
        const mailClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
        const { error } = await mailClient.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } })
        sendError = error
      } else {
        const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { workspace_invite: true } })
        sendError = error
      }

      if (sendError) {
        await admin.from('workspace_invites').delete().eq('id', invite.id)
        results.push({ email, ok: false, error: 'Invitation email could not be sent' })
      } else {
        results.push({ email, ok: true, inviteId: invite.id })
      }
    } catch {
      results.push({ email, ok: false, error: 'Unexpected invitation error' })
    }
  }

  const successCount = results.filter((item) => item.ok).length
  return json({ ok: successCount > 0, successCount, failureCount: results.length - successCount, results })
})
