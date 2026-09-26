import { supabase } from '../lib/supabase/client'
import { demoStore } from '../lib/demo-store'
import { devBypassEnabled } from '../lib/dev-bypass'
import type { EditableRole } from '../types/domain'

export interface BulkInviteResult {
  email: string
  ok: boolean
  inviteId?: string
  error?: string
}

export async function inviteWorkspaceMembers(input: { workspaceId: string; emails: string[]; role: EditableRole; intendedTeamId?: string }) {
  const emails = [...new Set(input.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))].slice(0, 50)
  if (!emails.length) throw new Error('Enter at least one valid email address.')
  if (devBypassEnabled) {
    const results: BulkInviteResult[] = emails.map((email) => {
      try {
        const value = demoStore.invite({ workspaceId: input.workspaceId, email, role: input.role, intendedTeamId: input.intendedTeamId })
        return { email, ok: true, inviteId: value.inviteId }
      } catch (error) {
        return { email, ok: false, error: error instanceof Error ? error.message : 'Invite failed' }
      }
    })
    return { ok: results.some((item) => item.ok), successCount: results.filter((item) => item.ok).length, failureCount: results.filter((item) => !item.ok).length, results }
  }
  const { data, error } = await supabase.functions.invoke('invite-workspace-member', { body: { workspaceId: input.workspaceId, emails, role: input.role, intendedTeamId: input.intendedTeamId } })
  if (error) throw new Error('We could not send the invitation. Try again.')
  return data as { ok: boolean; successCount: number; failureCount: number; results: BulkInviteResult[] }
}

export async function inviteWorkspaceMember(input: { workspaceId: string; email: string; role: EditableRole }) {
  const result = await inviteWorkspaceMembers({ ...input, emails: [input.email] })
  const first = result.results[0]
  if (!first?.ok) throw new Error(first?.error ?? 'Could not send invitation.')
  return { ok: true as const, inviteId: first.inviteId ?? '' }
}

export async function acceptWorkspaceInvite(token: string) {
  if (devBypassEnabled) return { ok: true as const, workspaceSlug: 'teamspace', workspaceId: '22222222-2222-4222-8222-222222222222' }
  const { data, error } = await supabase.functions.invoke('accept-workspace-invite', { body: { token } })
  if (error) {
    let message = 'Could not join the workspace. Please try again.'
    const response = error.context
    if (response instanceof Response) {
      try {
        const body: unknown = await response.json()
        if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') message = body.error
      } catch { /* Keep the friendly fallback. */ }
    }
    throw new Error(message)
  }
  return data as { ok: true; workspaceSlug: string; workspaceId: string }
}

export interface InvitePreview { workspaceName: string; inviterName: string | null; role: EditableRole; available: boolean; status: string; expiresAt: string }

export async function previewWorkspaceInvite(token: string): Promise<InvitePreview> {
  if (devBypassEnabled) throw new Error('Invitation links require a real account.')
  const { data, error } = await supabase.functions.invoke('preview-workspace-invite', { body: { token } })
  if (error) throw new Error('This invitation is no longer available.')
  return data as InvitePreview
}

export async function resendInvite(workspaceId: string, inviteId: string) {
  if (devBypassEnabled) throw new Error('Email delivery is unavailable in development bypass mode.')
  const { error } = await supabase.functions.invoke('invite-workspace-member', { body: { action: 'resend', workspaceId, inviteId } })
  if (error) throw new Error('We could not resend the invitation. Try again in a few minutes.')
}

export async function listPendingInvites(workspaceId: string) {
  if (devBypassEnabled) return demoStore.listInvites(workspaceId)
  const { data, error } = await supabase.from('workspace_invites').select('*').eq('workspace_id', workspaceId).eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function cancelInvite(workspaceId: string, inviteId: string) {
  if (devBypassEnabled) return demoStore.cancelInvite(workspaceId, inviteId)
  const { error } = await supabase.from('workspace_invites').update({ status: 'cancelled' }).eq('id', inviteId).eq('workspace_id', workspaceId).eq('status', 'pending')
  if (error) throw error
}
