import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase/client'
import { devBypassEnabled } from '../lib/dev-bypass'
import { pageKeys } from '../features/pages/queries'
import { workspaceKeys } from '../features/workspace/queries'

export function useWorkspaceRealtime(workspaceId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (devBypassEnabled || !workspaceId) return
    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_pages', filter: `workspace_id=eq.${workspaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspaceId) })
        void queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspaceId, true) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_blocks', filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        const pageId = String((payload.new as { page_id?: string }).page_id ?? (payload.old as { page_id?: string }).page_id ?? '')
        if (pageId) void queryClient.invalidateQueries({ queryKey: pageKeys.blocks(pageId) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_databases', filter: `workspace_id=eq.${workspaceId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspaceId) })
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [workspaceId, queryClient])
}
