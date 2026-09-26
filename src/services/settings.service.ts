import { supabase } from '../lib/supabase/client'
import { demoStore } from '../lib/demo-store'
import { devBypassEnabled } from '../lib/dev-bypass'
import type { WorkspaceSettings } from '../types/database.types'

export async function getWorkspacePermissions(workspaceId: string): Promise<WorkspaceSettings> {
  if (devBypassEnabled) return demoStore.getSettings(workspaceId)
  const { data, error } = await supabase.from('workspace_settings').select('*').eq('workspace_id', workspaceId).single()
  if (error) throw error
  return data as unknown as WorkspaceSettings
}

export async function updateWorkspacePermissions(workspaceId: string, patch: Partial<Pick<WorkspaceSettings, 'who_can_invite' | 'who_can_create_team' | 'who_can_create_collection' | 'who_can_create_page'>>): Promise<WorkspaceSettings> {
  if (devBypassEnabled) return demoStore.updateSettings(workspaceId, patch)
  const { data, error } = await supabase.from('workspace_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('workspace_id', workspaceId).select('*').single()
  if (error) throw new Error('Could not save permissions.')
  return data as unknown as WorkspaceSettings
}
