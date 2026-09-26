import { supabase } from '../lib/supabase/client'
import { demoStore } from '../lib/demo-store'
import { devBypassEnabled } from '../lib/dev-bypass'

export async function listArchivedCollections(workspaceId: string) {
  if (devBypassEnabled) return demoStore.listArchivedDatabases(workspaceId)
  const { data, error } = await supabase.from('workspace_databases').select('*').eq('workspace_id', workspaceId).not('archived_at', 'is', null).order('archived_at', { ascending: false })
  if (error) throw error
  return data
}

export async function renameCollection(workspaceId: string, databaseId: string, name: string) {
  if (!name.trim()) throw new Error('Enter a collection name.')
  if (devBypassEnabled) return demoStore.updateDatabase(databaseId, { name: name.trim() })
  const { data, error } = await supabase.from('workspace_databases').update({ name: name.trim() }).eq('workspace_id', workspaceId).eq('id', databaseId).select('*').single()
  if (error) throw new Error('Could not rename collection.')
  return data
}

export async function setCollectionArchived(workspaceId: string, databaseId: string, archived: boolean) {
  if (devBypassEnabled) return demoStore.updateDatabase(databaseId, { archived_at: archived ? new Date().toISOString() : null })
  const { data, error } = await supabase.from('workspace_databases').update({ archived_at: archived ? new Date().toISOString() : null }).eq('workspace_id', workspaceId).eq('id', databaseId).select('*').single()
  if (error) throw new Error(archived ? 'Could not move collection to Trash.' : 'Could not restore collection.')
  return data
}

export async function permanentlyDeleteCollection(workspaceId: string, databaseId: string) {
  if (devBypassEnabled) return demoStore.deleteDatabase(databaseId)
  const { error } = await supabase.from('workspace_databases').delete().eq('workspace_id', workspaceId).eq('id', databaseId).not('archived_at', 'is', null)
  if (error) throw new Error('Could not delete collection.')
}
import type { DatabaseProperty, DatabaseRow, DatabaseView, Json, PropertyType, ViewType, WorkspaceDatabase } from '../types/database.types'
import type { RowData } from '../types/domain'

export const ROW_PAGE_SIZE = 100

export async function getDatabase(databaseId: string) {
  if (devBypassEnabled) return demoStore.getDatabase(databaseId)
  const { data, error } = await supabase.from('workspace_databases').select('*').eq('id', databaseId).is('archived_at', null).maybeSingle()
  if (error) throw error
  return data as WorkspaceDatabase | null
}

export async function getProperties(databaseId: string) {
  if (devBypassEnabled) return demoStore.getProperties(databaseId)
  const { data, error } = await supabase.from('database_properties').select('*').eq('database_id', databaseId).is('archived_at', null).order('position')
  if (error) throw error
  return data
}

export async function getViews(databaseId: string) {
  if (devBypassEnabled) return demoStore.getViews(databaseId)
  const { data, error } = await supabase.from('database_views').select('*').eq('database_id', databaseId).order('position')
  if (error) throw error
  return data
}

export async function getRowsPage(params: { databaseId: string; workspaceId: string; view?: DatabaseView | null; page: number; search?: string }) {
  if (devBypassEnabled) return demoStore.getRowsPage({ ...params, pageSize: ROW_PAGE_SIZE })
  const { data, error } = await supabase.rpc('query_database_rows', {
    p_database_id: params.databaseId,
    p_workspace_id: params.workspaceId,
    p_filters: params.view?.filters ?? [],
    p_search: params.search?.trim() || undefined,
    p_limit: ROW_PAGE_SIZE,
    p_offset: params.page * ROW_PAGE_SIZE,
  })
  if (error) throw error
  return data
}

export async function createDatabase(input: { workspaceId: string; name: string; description?: string; viewType?: ViewType; teamId?: string | null }) {
  if (devBypassEnabled) return demoStore.createDatabase(input)
  const { data, error } = await supabase.rpc('create_workspace_database', {
    p_workspace_id: input.workspaceId,
    p_name: input.name.trim(),
    p_description: input.description?.trim() || undefined,
    p_view_type: input.viewType ?? 'table',
    // Always include this argument so PostgREST selects the team-aware RPC
    // even when the collection is workspace-scoped.
    p_team_id: input.teamId ?? undefined,
  })
  if (error) throw error
  const created = data[0]
  if (!created) throw new Error('Database creation returned no result')
  return created
}

export async function createView(input: { databaseId: string; workspaceId: string; userId: string; name: string; viewType: ViewType }) {
  if (devBypassEnabled) {
    const database = demoStore.getDatabase(input.databaseId)
    if (!database) throw new Error('Database not found')
    return demoStore.createView(input)
  }
  const existing = await getViews(input.databaseId)
  const { data, error } = await supabase.from('database_views').insert({ database_id: input.databaseId, workspace_id: input.workspaceId, name: input.name.trim(), view_type: input.viewType, position: existing.length, created_by: input.userId }).select('*').single()
  if (error) throw error
  return data
}

export async function createRow(input: { databaseId: string; workspaceId: string; userId: string; data?: RowData }) {
  if (devBypassEnabled) return demoStore.createRow(input)
  const { data, error } = await supabase.from('database_rows').insert({
    database_id: input.databaseId,
    workspace_id: input.workspaceId,
    created_by: input.userId,
    updated_by: input.userId,
    data: (input.data ?? {}) as Json,
    position: Date.now(),
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updateRowData(row: DatabaseRow, propertyId: string, value: Json | undefined) {
  if (devBypassEnabled) return demoStore.updateRow(row, propertyId, value)
  const current = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {}
  const next = { ...current }
  if (value === undefined || value === null || value === '') delete next[propertyId]
  else next[propertyId] = value
  const { data, error } = await supabase.from('database_rows').update({ data: next }).eq('id', row.id).eq('workspace_id', row.workspace_id).eq('database_id', row.database_id).select('*').single()
  if (error) throw error
  return data
}

export async function archiveRow(row: DatabaseRow) {
  if (devBypassEnabled) return demoStore.archiveRow(row)
  const { data, error } = await supabase.from('database_rows').update({ archived_at: new Date().toISOString() }).eq('id', row.id).eq('workspace_id', row.workspace_id).eq('database_id', row.database_id).select('*').single()
  if (error) throw error
  return data
}

export async function createProperty(input: { databaseId: string; name: string; propertyType: Exclude<PropertyType, 'title'>; config?: Json }) {
  if (devBypassEnabled) {
    const created = demoStore.createProperty(input)
    if (input.config) return demoStore.updateProperty(created.id, { config: input.config })
    return created
  }
  const { data: properties, error: countError } = await supabase.from('database_properties').select('position').eq('database_id', input.databaseId).is('archived_at', null).order('position', { ascending: false }).limit(1)
  if (countError) throw countError
  const position = (properties[0]?.position ?? -1) + 1
  const config = input.config ?? (input.propertyType === 'select' || input.propertyType === 'multi_select' ? { options: [] } : input.propertyType === 'currency' ? { currency: 'INR' } : {})
  const { data, error } = await supabase.from('database_properties').insert({ database_id: input.databaseId, name: input.name, property_type: input.propertyType, position, config }).select('*').single()
  if (error) throw error
  return data
}

export async function updateProperty(propertyId: string, patch: Partial<Pick<DatabaseProperty, 'name' | 'config' | 'position'>>) {
  if (devBypassEnabled) return demoStore.updateProperty(propertyId, patch)
  const { data, error } = await supabase.from('database_properties').update(patch).eq('id', propertyId).select('*').single()
  if (error) throw error
  return data
}

export async function renameProperty(propertyId: string, name: string) {
  await updateProperty(propertyId, { name })
}

export async function archiveProperty(propertyId: string) {
  if (devBypassEnabled) return demoStore.archiveProperty(propertyId)
  const { error } = await supabase.from('database_properties').update({ archived_at: new Date().toISOString() }).eq('id', propertyId)
  if (error) throw error
}

export async function updateView(viewId: string, patch: Partial<Pick<DatabaseView, 'filters' | 'sorts' | 'visible_property_ids' | 'property_widths' | 'name' | 'view_type'>>) {
  if (devBypassEnabled) return demoStore.updateView(viewId, patch)
  const { data, error } = await supabase.from('database_views').update(patch).eq('id', viewId).select('*').single()
  if (error) throw error
  return data
}

export async function listComments(rowId: string) {
  if (devBypassEnabled) return demoStore.listComments(rowId)
  const { data, error } = await supabase.from('row_comments').select('*').eq('row_id', rowId).order('created_at')
  if (error) throw error
  return data
}

export async function addComment(input: { workspaceId: string; databaseId: string; rowId: string; userId: string; body: string }) {
  if (devBypassEnabled) return demoStore.addComment(input)
  const { data, error } = await supabase.from('row_comments').insert({
    workspace_id: input.workspaceId,
    database_id: input.databaseId,
    row_id: input.rowId,
    user_id: input.userId,
    body: input.body,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updatePropertyPosition(propertyId: string, position: number) {
  await updateProperty(propertyId, { position })
}
