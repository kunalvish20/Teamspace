import { supabase } from '../lib/supabase/client'
import { demoStore } from '../lib/demo-store'
import { devBypassEnabled } from '../lib/dev-bypass'
import type { BlockType, Json, PageBlock, WorkspacePage } from '../types/database.types'

export async function listWorkspacePages(workspaceId: string, includeArchived = false): Promise<WorkspacePage[]> {
  if (devBypassEnabled) return demoStore.listPages(workspaceId, includeArchived)
  let query = supabase.from('workspace_pages').select('*').eq('workspace_id', workspaceId).order('position')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as WorkspacePage[]
}

export async function getWorkspacePage(pageId: string): Promise<WorkspacePage | null> {
  if (devBypassEnabled) return demoStore.getPage(pageId)
  const { data, error } = await supabase.from('workspace_pages').select('*').eq('id', pageId).maybeSingle()
  if (error) throw error
  return data as unknown as WorkspacePage | null
}

export async function createWorkspacePage(input: { workspaceId: string; userId: string; parentPageId?: string | null; title?: string; visibility?: WorkspacePage['visibility']; teamId?: string | null }): Promise<WorkspacePage> {
  if (devBypassEnabled) return demoStore.createPage(input)
  const { data, error } = await supabase.from('workspace_pages').insert({
    workspace_id: input.workspaceId,
    parent_page_id: input.parentPageId ?? null,
    title: input.title ?? 'Untitled',
    visibility: input.teamId ? 'workspace' : (input.visibility ?? 'private'),
    team_id: input.teamId ?? null,
    position: Date.now(),
    created_by: input.userId,
    updated_by: input.userId,
  }).select('*').single()
  if (error) throw error
  return data as unknown as WorkspacePage
}

export async function updateWorkspacePage(pageId: string, patch: Partial<Pick<WorkspacePage, 'title' | 'icon' | 'visibility' | 'cover_url' | 'parent_page_id' | 'position' | 'archived_at'>>): Promise<WorkspacePage> {
  if (devBypassEnabled) return demoStore.updatePage(pageId, patch)
  const { data, error } = await supabase.from('workspace_pages').update(patch).eq('id', pageId).select('*').single()
  if (error) throw error
  return data as unknown as WorkspacePage
}


export async function setWorkspacePageArchived(pageId: string, archived: boolean) {
  if (devBypassEnabled) return demoStore.setPageArchived(pageId, archived)
  const { data, error } = await supabase.rpc('set_page_archived', { p_page_id: pageId, p_archived: archived })
  if (error) throw error
  return data
}

export async function permanentlyDeletePage(pageId: string) {
  if (devBypassEnabled) return demoStore.deletePage(pageId)
  const { error } = await supabase.from('workspace_pages').delete().eq('id', pageId)
  if (error) throw error
}

export async function listPageBlocks(pageId: string) {
  if (devBypassEnabled) return demoStore.listBlocks(pageId)
  const { data, error } = await supabase.from('page_blocks').select('*').eq('page_id', pageId).order('position')
  if (error) throw error
  return data
}

export async function createPageBlock(input: { workspaceId: string; pageId: string; userId: string; blockType?: BlockType; content?: Json; position?: number }) {
  if (devBypassEnabled) return demoStore.createBlock({ ...input, blockType: input.blockType ?? 'paragraph' })
  const { data, error } = await supabase.from('page_blocks').insert({
    workspace_id: input.workspaceId,
    page_id: input.pageId,
    block_type: input.blockType ?? 'paragraph',
    content: input.content ?? { text: '' },
    position: input.position ?? Date.now(),
    created_by: input.userId,
    updated_by: input.userId,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updatePageBlock(blockId: string, patch: Partial<Pick<PageBlock, 'block_type' | 'content' | 'position'>>) {
  if (devBypassEnabled) return demoStore.updateBlock(blockId, patch)
  const { data, error } = await supabase.from('page_blocks').update(patch).eq('id', blockId).select('*').single()
  if (error) throw error
  return data
}

export async function deletePageBlock(blockId: string) {
  if (devBypassEnabled) return demoStore.deleteBlock(blockId)
  const { error } = await supabase.from('page_blocks').delete().eq('id', blockId)
  if (error) throw error
}

export async function listPageFavorites(workspaceId: string, userId: string) {
  if (devBypassEnabled) return demoStore.listFavorites(workspaceId, userId)
  const { data, error } = await supabase.from('page_favorites').select('*').eq('workspace_id', workspaceId).eq('user_id', userId)
  if (error) throw error
  return data
}

export async function setPageFavorite(input: { workspaceId: string; pageId: string; userId: string; favorite: boolean }) {
  if (devBypassEnabled) return demoStore.setFavorite(input)
  if (input.favorite) {
    const { error } = await supabase.from('page_favorites').upsert({ workspace_id: input.workspaceId, page_id: input.pageId, user_id: input.userId }, { onConflict: 'page_id,user_id' })
    if (error) throw error
  } else {
    const { error } = await supabase.from('page_favorites').delete().eq('page_id', input.pageId).eq('user_id', input.userId)
    if (error) throw error
  }
  return input.favorite
}
