import type { WorkspaceRole, WorkspaceSettings } from '../types/database.types'

export const canWriteRows = (role?: WorkspaceRole | null) => role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER'
export const canManageDatabase = canWriteRows
export const canUseWorkspaceAction = (role: WorkspaceRole | null | undefined, settings: WorkspaceSettings | undefined, action: 'invite' | 'create_team' | 'create_collection' | 'create_page') =>
  role === 'OWNER' || role === 'ADMIN' || (role === 'MEMBER' && settings?.[action === 'invite' ? 'who_can_invite' : action === 'create_team' ? 'who_can_create_team' : action === 'create_collection' ? 'who_can_create_collection' : 'who_can_create_page'] === 'everyone')
export const canInvite = (role?: WorkspaceRole | null, settings?: WorkspaceSettings) => canUseWorkspaceAction(role, settings, 'invite')
export const canManageRoles = (role?: WorkspaceRole | null) => role === 'OWNER'
export const isViewer = (role?: WorkspaceRole | null) => role === 'VIEWER'
