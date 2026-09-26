import { useQuery } from '@tanstack/react-query'
import { getWorkspacePage, listPageBlocks, listPageFavorites, listWorkspacePages } from '../../services/page.service'

export const pageKeys = {
  pages: (workspaceId: string, archived = false) => ['workspace', workspaceId, archived ? 'trash-pages' : 'pages'] as const,
  page: (pageId: string) => ['page', pageId] as const,
  blocks: (pageId: string) => ['page', pageId, 'blocks'] as const,
  favorites: (workspaceId: string, userId: string) => ['workspace', workspaceId, 'favorites', userId] as const,
}

export function useWorkspacePages(workspaceId?: string, archived = false) {
  return useQuery({ queryKey: pageKeys.pages(workspaceId ?? '', archived), queryFn: () => listWorkspacePages(workspaceId ?? '', archived), enabled: Boolean(workspaceId) })
}

export function useWorkspacePage(pageId?: string) {
  return useQuery({ queryKey: pageKeys.page(pageId ?? ''), queryFn: () => getWorkspacePage(pageId ?? ''), enabled: Boolean(pageId) })
}

export function usePageBlocks(pageId?: string) {
  return useQuery({ queryKey: pageKeys.blocks(pageId ?? ''), queryFn: () => listPageBlocks(pageId ?? ''), enabled: Boolean(pageId) })
}

export function usePageFavorites(workspaceId?: string, userId?: string) {
  return useQuery({ queryKey: pageKeys.favorites(workspaceId ?? '', userId ?? ''), queryFn: () => listPageFavorites(workspaceId ?? '', userId ?? ''), enabled: Boolean(workspaceId && userId) })
}
