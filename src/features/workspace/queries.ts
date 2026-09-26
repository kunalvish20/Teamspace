import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { currentWorkspaceRole, getWorkspaceBySlug, listWorkspaceDatabases, listWorkspaceMembers, listWorkspaces } from '../../services/workspace.service'
import { getWorkspacePermissions } from '../../services/settings.service'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  bySlug: (slug: string) => ['workspace', slug] as const,
  databases: (id: string) => ['workspace', id, 'databases'] as const,
  members: (id: string) => ['workspace', id, 'members'] as const,
  role: (id: string, userId: string) => ['workspace', id, 'role', userId] as const,
  settings: (id: string) => ['workspace', id, 'settings'] as const,
}

export function useWorkspacePermissions(workspaceId?: string) {
  return useQuery({ queryKey: workspaceKeys.settings(workspaceId ?? ''), queryFn: () => getWorkspacePermissions(workspaceId ?? ''), enabled: Boolean(workspaceId) })
}

export function useWorkspaces() {
  return useQuery({ queryKey: workspaceKeys.all, queryFn: listWorkspaces })
}

export function useWorkspace(slug?: string) {
  return useQuery({
    queryKey: workspaceKeys.bySlug(slug ?? ''),
    queryFn: () => getWorkspaceBySlug(slug ?? ''),
    enabled: Boolean(slug),
  })
}

export function useWorkspaceDatabases(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceKeys.databases(workspaceId ?? ''),
    queryFn: () => listWorkspaceDatabases(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
  })
}

export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? ''),
    queryFn: () => listWorkspaceMembers(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
  })
}

export function useWorkspaceRole(workspaceId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: workspaceKeys.role(workspaceId ?? '', user?.id ?? ''),
    queryFn: () => currentWorkspaceRole(workspaceId ?? '', user?.id ?? ''),
    enabled: Boolean(workspaceId && user),
  })
}
