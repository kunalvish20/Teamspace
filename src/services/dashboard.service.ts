import { supabase } from '../lib/supabase/client'
import { demoStore } from '../lib/demo-store'
import { devBypassEnabled } from '../lib/dev-bypass'
import type { DatabaseRow } from '../types/database.types'

export async function getDashboardRows(databaseId: string, workspaceId: string): Promise<DatabaseRow[]> {
  if (devBypassEnabled) return demoStore.getRowsPage({ databaseId, workspaceId, page: 0, pageSize: Number.MAX_SAFE_INTEGER })
  const { data, error } = await supabase.rpc('get_collection_dashboard_data', { p_database_id: databaseId })
  if (error) throw new Error('Could not load dashboard data.')
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const rows = (data as { rows?: unknown }).rows
  return Array.isArray(rows) ? rows as DatabaseRow[] : []
}

export async function getDashboardMetrics(databaseId: string) {
  if (devBypassEnabled) return demoStore.dashboard(databaseId)
  const { data, error } = await supabase.rpc('get_crm_dashboard_metrics', { p_database_id: databaseId })
  if (error) throw error
  return data[0] ?? { total_records: 0, leads: 0, follow_ups: 0, potential: 0, closing: 0, closed: 0, total_revenue: 0 }
}
