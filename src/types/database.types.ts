export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'
export type PropertyType =
  | 'title' | 'text' | 'number' | 'currency' | 'phone' | 'email' | 'date' | 'datetime'
  | 'select' | 'multi_select' | 'checkbox' | 'person' | 'multi_person' | 'url'
export type ViewType = 'table' | 'board' | 'calendar' | 'gallery'
export type BlockType = 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bulleted_list' | 'numbered_list' | 'todo' | 'quote' | 'callout' | 'code' | 'divider'

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
  created_at: string
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  invited_by: string
  invite_token: string
  status: InviteStatus
  expires_at: string
  accepted_at: string | null
  intended_team_id: string | null
  last_sent_at: string
  cancelled_at: string | null
  created_at: string
}

export interface Team {
  id: string
  workspace_id: string
  name: string
  description: string | null
  icon: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  team_id: string
  workspace_id: string
  user_id: string
  created_at: string
}

export interface WorkspaceSettings {
  workspace_id: string
  who_can_invite: 'admins' | 'everyone'
  who_can_create_team: 'admins' | 'everyone'
  who_can_create_collection: 'admins' | 'everyone'
  who_can_create_page: 'admins' | 'everyone'
  updated_at: string
}

export interface WorkspaceDatabase {
  id: string
  workspace_id: string
  team_id?: string | null
  name: string
  icon: string | null
  description: string | null
  created_by: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseProperty {
  id: string
  database_id: string
  name: string
  property_type: PropertyType
  position: number
  config: Json
  is_required: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseView {
  id: string
  database_id: string
  workspace_id: string
  name: string
  view_type: ViewType
  filters: Json
  sorts: Json
  visible_property_ids: Json
  property_widths: Json
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface DatabaseRow {
  id: string
  database_id: string
  workspace_id: string
  created_by: string
  updated_by: string
  data: Json
  position: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface RowComment {
  id: string
  workspace_id: string
  database_id: string
  row_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface WorkspacePage {
  id: string
  workspace_id: string
  parent_page_id: string | null
  title: string
  icon: string | null
  visibility: 'private' | 'workspace'
  team_id?: string | null
  cover_url: string | null
  position: number
  created_by: string
  updated_by: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface PageBlock {
  id: string
  workspace_id: string
  page_id: string
  block_type: BlockType
  content: Json
  position: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface PageFavorite {
  id: string
  workspace_id: string
  page_id: string
  user_id: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Pick<Profile, 'id'> & Partial<Omit<Profile, 'id'>>, Partial<Profile>>
      workspaces: Table<Workspace, Pick<Workspace, 'name' | 'slug' | 'owner_id'> & Partial<Workspace>, Partial<Workspace>>
      workspace_members: Table<WorkspaceMember, Pick<WorkspaceMember, 'workspace_id' | 'user_id'> & Partial<WorkspaceMember>, Partial<WorkspaceMember>>
      workspace_invites: Table<WorkspaceInvite, Pick<WorkspaceInvite, 'workspace_id' | 'email' | 'invited_by' | 'invite_token' | 'expires_at'> & Partial<WorkspaceInvite>, Partial<WorkspaceInvite>>
      teams: Table<Team, Pick<Team, 'workspace_id' | 'name' | 'created_by'> & Partial<Team>, Partial<Team>>
      team_members: Table<TeamMember, Pick<TeamMember, 'team_id' | 'workspace_id' | 'user_id'> & Partial<TeamMember>, Partial<TeamMember>>
      workspace_settings: Table<WorkspaceSettings, Pick<WorkspaceSettings, 'workspace_id'> & Partial<WorkspaceSettings>, Partial<WorkspaceSettings>>
      workspace_databases: Table<WorkspaceDatabase, Pick<WorkspaceDatabase, 'workspace_id' | 'name' | 'created_by'> & Partial<WorkspaceDatabase>, Partial<WorkspaceDatabase>>
      database_properties: Table<DatabaseProperty, Pick<DatabaseProperty, 'database_id' | 'name' | 'property_type'> & Partial<DatabaseProperty>, Partial<DatabaseProperty>>
      database_views: Table<DatabaseView, Pick<DatabaseView, 'database_id' | 'workspace_id' | 'name' | 'created_by'> & Partial<DatabaseView>, Partial<DatabaseView>>
      database_rows: Table<DatabaseRow, Pick<DatabaseRow, 'database_id' | 'workspace_id' | 'created_by' | 'updated_by'> & Partial<DatabaseRow>, Partial<DatabaseRow>>
      row_comments: Table<RowComment, Pick<RowComment, 'workspace_id' | 'database_id' | 'row_id' | 'user_id' | 'body'> & Partial<RowComment>, Partial<RowComment>>
      workspace_pages: Table<WorkspacePage, Pick<WorkspacePage, 'workspace_id' | 'title' | 'created_by' | 'updated_by'> & Partial<WorkspacePage>, Partial<WorkspacePage>>
      page_blocks: Table<PageBlock, Pick<PageBlock, 'workspace_id' | 'page_id' | 'block_type' | 'created_by' | 'updated_by'> & Partial<PageBlock>, Partial<PageBlock>>
      page_favorites: Table<PageFavorite, Pick<PageFavorite, 'workspace_id' | 'page_id' | 'user_id'> & Partial<PageFavorite>, Partial<PageFavorite>>
    }
    Views: Record<string, never>
    Functions: {
      create_workspace: {
        Args: { p_name: string; p_slug?: string | null; p_create_default_crm?: boolean }
        Returns: { workspace_id: string; workspace_slug: string; database_id: string | null }[]
      }
      create_workspace_database: {
        Args: { p_workspace_id: string; p_name: string; p_description?: string | null; p_view_type?: ViewType; p_team_id?: string | null }
        Returns: { database_id: string; view_id: string }[]
      }
      set_page_archived: { Args: { p_page_id: string; p_archived: boolean }; Returns: number }
      seed_demo_crm: { Args: { p_database_id: string }; Returns: number }
      accept_workspace_invitation: { Args: { p_token_hash: string }; Returns: { workspace_id: string; workspace_slug: string }[] }
      leave_workspace: { Args: { p_workspace_id: string }; Returns: void }
      delete_workspace: { Args: { p_workspace_id: string; p_name: string }; Returns: void }
      get_crm_dashboard_metrics: {
        Args: { p_database_id: string }
        Returns: { total_records: number; leads: number; follow_ups: number; potential: number; closing: number; closed: number; total_revenue: number }[]
      }
      query_database_rows: {
        Args: { p_database_id: string; p_workspace_id: string; p_filters?: Json; p_search?: string | null; p_limit?: number; p_offset?: number }
        Returns: DatabaseRow[]
      }
    }
    Enums: {
      workspace_role: WorkspaceRole
      invite_status: InviteStatus
      database_property_type: PropertyType
      database_view_type: ViewType
      page_block_type: BlockType
    }
    CompositeTypes: Record<string, never>
  }
}
