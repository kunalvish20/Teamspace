import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getDatabase, getProperties, getRowsPage, getViews, ROW_PAGE_SIZE } from '../../services/database.service'
import type { DatabaseView } from '../../types/database.types'

export const databaseKeys = {
  database: (id: string) => ['database', id] as const,
  properties: (id: string) => ['database', id, 'properties'] as const,
  views: (id: string) => ['database', id, 'views'] as const,
  rows: (id: string, viewId: string, search = '') => ['database', id, 'rows', viewId, search] as const,
  comments: (rowId: string) => ['row', rowId, 'comments'] as const,
}

export function useDatabase(databaseId?: string) {
  return useQuery({ queryKey: databaseKeys.database(databaseId ?? ''), queryFn: () => getDatabase(databaseId ?? ''), enabled: Boolean(databaseId) })
}

export function useDatabaseProperties(databaseId?: string) {
  return useQuery({ queryKey: databaseKeys.properties(databaseId ?? ''), queryFn: () => getProperties(databaseId ?? ''), enabled: Boolean(databaseId) })
}

export function useDatabaseViews(databaseId?: string) {
  return useQuery({ queryKey: databaseKeys.views(databaseId ?? ''), queryFn: () => getViews(databaseId ?? ''), enabled: Boolean(databaseId) })
}

export function useDatabaseRows(input: { databaseId?: string; workspaceId?: string; view?: DatabaseView | null; search?: string }) {
  const viewKey = input.view?.id ?? 'main'
  return useInfiniteQuery({
    queryKey: databaseKeys.rows(input.databaseId ?? '', viewKey, input.search ?? ''),
    queryFn: ({ pageParam }) => getRowsPage({ databaseId: input.databaseId ?? '', workspaceId: input.workspaceId ?? '', view: input.view, page: pageParam, search: input.search }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.length < ROW_PAGE_SIZE ? undefined : allPages.length,
    enabled: Boolean(input.databaseId && input.workspaceId),
  })
}
