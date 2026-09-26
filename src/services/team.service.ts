import { supabase } from '../lib/supabase/client'
import { devBypassEnabled } from '../lib/dev-bypass'
import { demoStore } from '../lib/demo-store'
import type { Team, TeamMember } from '../types/database.types'

export async function listTeams(workspaceId: string): Promise<Team[]> {
  if (devBypassEnabled) return demoStore.listTeams(workspaceId)
  const { data, error } = await supabase.from('teams').select('*').eq('workspace_id', workspaceId).order('name')
  if (error) throw error
  return data
}

export async function createTeam(input: { workspaceId: string; userId: string; name: string; description?: string; icon?: string }): Promise<Team> {
  const name = input.name.trim()
  if (!name || name.length > 120) throw new Error('Enter a team name under 120 characters.')
  if (devBypassEnabled) return demoStore.createTeam({ workspaceId: input.workspaceId, name, description: input.description?.trim(), icon: input.icon?.trim() })
  const { data, error } = await supabase.from('teams').insert({ workspace_id: input.workspaceId, created_by: input.userId, name, description: input.description?.trim() || null, icon: input.icon?.trim() || null }).select('*').single()
  if (error) throw new Error(error.code === '23505' ? 'A team with this name already exists.' : 'Could not create team.')
  return data
}

export async function updateTeam(teamId: string, workspaceId: string, patch: Pick<Partial<Team>, 'name' | 'description' | 'icon'>): Promise<Team> {
  const clean = { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) }
  if (clean.name !== undefined && (!clean.name || clean.name.length > 120)) throw new Error('Enter a team name under 120 characters.')
  if (devBypassEnabled) return demoStore.updateTeam(teamId, clean)
  const { data, error } = await supabase.from('teams').update(clean).eq('id', teamId).eq('workspace_id', workspaceId).select('*').single()
  if (error) throw new Error(error.code === '23505' ? 'A team with this name already exists.' : 'Could not update team.')
  return data
}

export async function deleteTeam(teamId: string, workspaceId: string) {
  if (devBypassEnabled) return demoStore.deleteTeam(teamId)
  const { error } = await supabase.from('teams').delete().eq('id', teamId).eq('workspace_id', workspaceId)
  if (error) throw new Error('Could not delete team.')
}

export async function listTeamMembers(teamId: string, workspaceId: string): Promise<TeamMember[]> {
  if (devBypassEnabled) return demoStore.listTeamMembers(teamId)
  const { data, error } = await supabase.from('team_members').select('*').eq('team_id', teamId).eq('workspace_id', workspaceId)
  if (error) throw error
  return data
}

export async function addTeamMember(teamId: string, workspaceId: string, userId: string) {
  if (devBypassEnabled) return demoStore.addTeamMember(teamId, workspaceId, userId)
  const { error } = await supabase.from('team_members').insert({ team_id: teamId, workspace_id: workspaceId, user_id: userId })
  if (error) throw new Error(error.code === '23505' ? 'This person is already on the team.' : 'Choose an existing workspace member.')
}

export async function removeTeamMember(teamId: string, workspaceId: string, userId: string) {
  if (devBypassEnabled) return demoStore.removeTeamMember(teamId, userId)
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('workspace_id', workspaceId).eq('user_id', userId)
  if (error) throw new Error('Could not remove this person from the team.')
}

export async function listUserTeams(workspaceId: string, userId: string): Promise<Team[]> {
  if (devBypassEnabled) return demoStore.listTeams(workspaceId)
  const { data: memberships, error: mError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (mError) throw mError
  const teamIds = (memberships ?? []).map((m) => m.team_id)
  if (!teamIds.length) return []
  const { data: teams, error: tError } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds)
    .order('name')
  if (tError) throw tError
  return teams
}

