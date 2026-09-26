import { supabase } from '../lib/supabase/client'
import { demoStore } from '../lib/demo-store'
import { devBypassEnabled } from '../lib/dev-bypass'
import type { MemberWithProfile } from '../types/domain'
import type { WorkspaceRole } from '../types/database.types'

export async function listWorkspaces() {
  if (devBypassEnabled) return demoStore.listWorkspaces()
  const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getWorkspaceBySlug(slug: string) {
  if (devBypassEnabled) return demoStore.getWorkspaceBySlug(slug)
  const { data, error } = await supabase.from('workspaces').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function createWorkspace(name: string) {
  if (devBypassEnabled) return demoStore.createWorkspace(name)
  const { data, error } = await supabase.rpc('create_workspace', { p_name: name, p_create_default_crm: false })
  if (error) throw error
  const created = data[0]
  if (!created) throw new Error('Workspace creation returned no result')
  return created
}

export async function updateWorkspaceName(workspaceId: string, name: string) {
  return updateWorkspaceSettings(workspaceId, { name })
}

export async function updateWorkspaceSettings(workspaceId: string, patch: { name?: string; logo_url?: string | null }) {
  const clean = { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) }
  if (devBypassEnabled) return demoStore.updateWorkspace(workspaceId, clean)
  const { data, error } = await supabase.from('workspaces').update(clean).eq('id', workspaceId).select('*').single()
  if (error) throw error
  return data
}

export async function listWorkspaceDatabases(workspaceId: string) {
  if (devBypassEnabled) return demoStore.listDatabases(workspaceId)
  const { data, error } = await supabase.from('workspace_databases').select('*').eq('workspace_id', workspaceId).is('archived_at', null).order('created_at')
  if (error) throw error
  return data
}

export async function listWorkspaceMembers(workspaceId: string): Promise<MemberWithProfile[]> {
  if (devBypassEnabled) return demoStore.listMembers(workspaceId)
  const { data: members, error } = await supabase.from('workspace_members').select('*').eq('workspace_id', workspaceId).order('joined_at')
  if (error) throw error
  const ids = members.map((member) => member.user_id)
  if (!ids.length) return []
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').in('id', ids)
  if (profilesError) throw profilesError
  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  return members.map((member) => ({ ...member, profile: byId.get(member.user_id) ?? null }))
}

export async function currentWorkspaceRole(workspaceId: string, userId: string) {
  if (devBypassEnabled) return demoStore.role(workspaceId, userId)
  const { data, error } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.role ?? null
}

export async function changeMemberRole(workspaceId: string, memberId: string, role: Exclude<WorkspaceRole, 'OWNER'>) {
  if (devBypassEnabled) return demoStore.changeMemberRole(workspaceId, memberId, role)
  const { error } = await supabase.from('workspace_members').update({ role }).eq('id', memberId).eq('workspace_id', workspaceId)
  if (error) throw error
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string) {
  if (devBypassEnabled) return demoStore.removeMember(workspaceId, memberId)
  const { error } = await supabase.from('workspace_members').delete().eq('id', memberId).eq('workspace_id', workspaceId)
  if (error) throw error
}

export async function leaveWorkspace(workspaceId: string) {
  if (devBypassEnabled) throw new Error('Leaving is unavailable in development bypass mode.')
  const { error } = await supabase.rpc('leave_workspace', { p_workspace_id: workspaceId })
  if (error) throw new Error('Could not leave this workspace. Owners must transfer ownership first.')
}

export async function deleteWorkspace(workspaceId: string, name: string) {
  if (devBypassEnabled) throw new Error('Deletion is unavailable in development bypass mode.')
  const { error } = await supabase.rpc('delete_workspace', { p_workspace_id: workspaceId, p_name: name })
  if (error) throw new Error('Could not delete this workspace. Check its name and try again.')
}
