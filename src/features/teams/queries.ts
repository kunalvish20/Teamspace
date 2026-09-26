import { useQuery } from '@tanstack/react-query'
import { listTeamMembers, listTeams, listUserTeams } from '../../services/team.service'

export const teamKeys = {
  list: (workspaceId: string) => ['workspace', workspaceId, 'teams'] as const,
  members: (workspaceId: string, teamId: string) => ['workspace', workspaceId, 'teams', teamId, 'members'] as const,
  userTeams: (workspaceId: string, userId: string) => ['workspace', workspaceId, 'user-teams', userId] as const,
}

export function useTeams(workspaceId?: string) {
  return useQuery({ queryKey: teamKeys.list(workspaceId ?? ''), queryFn: () => listTeams(workspaceId ?? ''), enabled: Boolean(workspaceId) })
}

export function useTeamMembers(workspaceId?: string, teamId?: string) {
  return useQuery({ queryKey: teamKeys.members(workspaceId ?? '', teamId ?? ''), queryFn: () => listTeamMembers(teamId ?? '', workspaceId ?? ''), enabled: Boolean(workspaceId && teamId) })
}

export function useUserTeams(workspaceId?: string, userId?: string) {
  return useQuery({
    queryKey: teamKeys.userTeams(workspaceId ?? '', userId ?? ''),
    queryFn: () => listUserTeams(workspaceId ?? '', userId ?? ''),
    enabled: Boolean(workspaceId && userId),
  })
}

