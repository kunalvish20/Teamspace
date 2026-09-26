import { useEffect } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase/client'
import type { DatabaseRow } from '../types/database.types'
import { devBypassEnabled } from '../lib/dev-bypass'

function patchPages(data: InfiniteData<DatabaseRow[], number> | undefined, payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: DatabaseRow | Record<string, never>; old: DatabaseRow | Record<string, never> }) {
  if (!data) return data
  const newRow = payload.new as DatabaseRow
  const oldRow = payload.old as DatabaseRow
  const id = newRow.id || oldRow.id
  if (!id) return data

  const exists = data.pages.some((page) => page.some((row) => row.id === id))
  if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && newRow.archived_at)) {
    return { ...data, pages: data.pages.map((page) => page.filter((row) => row.id !== id)) }
  }
  if (payload.eventType === 'UPDATE') {
    return { ...data, pages: data.pages.map((page) => page.map((row) => row.id === id ? newRow : row)) }
  }
  if (payload.eventType === 'INSERT' && !exists) {
    const pages = data.pages.map((page) => [...page])
    if (!pages[0]) pages.push([])
    pages[0] = [newRow, ...(pages[0] ?? [])]
    return { ...data, pages }
  }
  return data
}

export function useDatabaseRealtime(databaseId?: string, workspaceId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (devBypassEnabled || !databaseId || !workspaceId) return
    const channel = supabase
      .channel(`database:${databaseId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'database_rows',
        filter: `database_id=eq.${databaseId},workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        queryClient.setQueriesData<InfiniteData<DatabaseRow[], number>>(
          { queryKey: ['database', databaseId, 'rows'] },
          (current) => patchPages(current, {
            eventType: payload.eventType,
            new: payload.new as DatabaseRow,
            old: payload.old as DatabaseRow,
          }),
        )
        void queryClient.invalidateQueries({ queryKey: ['database', databaseId, 'rows'], refetchType: 'active' })
        void queryClient.invalidateQueries({ queryKey: ['database', databaseId, 'dashboard'] })
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [databaseId, workspaceId, queryClient])
}
