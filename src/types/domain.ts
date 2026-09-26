import type { DatabaseProperty, DatabaseRow, DatabaseView, Json, Profile, WorkspaceMember, WorkspaceRole } from './database.types'

export interface SelectOption {
  id: string
  label: string
  color?: string
}

export interface PropertyConfig {
  currency?: string
  options?: SelectOption[]
}

export interface ViewFilter {
  propertyId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty' | 'before' | 'after' | 'on' | 'greater_than' | 'less_than' | 'contains_person'
  value?: Json
}

export interface ViewSort {
  propertyId: string
  direction: 'asc' | 'desc'
}

export interface MemberWithProfile extends WorkspaceMember {
  profile: Profile | null
}

export type EditableRole = Exclude<WorkspaceRole, 'OWNER'>

export type RowData = Record<string, Json | undefined>

export interface DatabaseBundle {
  properties: DatabaseProperty[]
  views: DatabaseView[]
  rows: DatabaseRow[]
}
