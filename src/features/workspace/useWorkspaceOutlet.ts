import { useOutletContext } from 'react-router-dom'
import type { Workspace, WorkspaceDatabase, WorkspaceRole } from '../../types/database.types'

export function useWorkspaceOutlet() {
  return useOutletContext<{ workspace: Workspace; role: WorkspaceRole; databases: WorkspaceDatabase[]; databasesLoading: boolean; databasesError: boolean; retryDatabases: () => void }>()
}
