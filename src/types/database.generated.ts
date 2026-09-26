export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      database_properties: {
        Row: {
          archived_at: string | null
          config: Json
          created_at: string
          database_id: string
          id: string
          is_required: boolean
          name: string
          position: number
          property_type: Database["public"]["Enums"]["database_property_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          config?: Json
          created_at?: string
          database_id: string
          id?: string
          is_required?: boolean
          name: string
          position?: number
          property_type: Database["public"]["Enums"]["database_property_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          config?: Json
          created_at?: string
          database_id?: string
          id?: string
          is_required?: boolean
          name?: string
          position?: number
          property_type?: Database["public"]["Enums"]["database_property_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_properties_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "workspace_databases"
            referencedColumns: ["id"]
          },
        ]
      }
      database_rows: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          data: Json
          database_id: string
          id: string
          position: number
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          data?: Json
          database_id: string
          id?: string
          position?: number
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          data?: Json
          database_id?: string
          id?: string
          position?: number
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_rows_database_id_workspace_id_fkey"
            columns: ["database_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_databases"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      database_views: {
        Row: {
          created_at: string
          created_by: string
          database_id: string
          filters: Json
          id: string
          name: string
          position: number
          property_widths: Json
          sorts: Json
          updated_at: string
          view_type: Database["public"]["Enums"]["database_view_type"]
          visible_property_ids: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          database_id: string
          filters?: Json
          id?: string
          name: string
          position?: number
          property_widths?: Json
          sorts?: Json
          updated_at?: string
          view_type?: Database["public"]["Enums"]["database_view_type"]
          visible_property_ids?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          database_id?: string
          filters?: Json
          id?: string
          name?: string
          position?: number
          property_widths?: Json
          sorts?: Json
          updated_at?: string
          view_type?: Database["public"]["Enums"]["database_view_type"]
          visible_property_ids?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_views_database_id_workspace_id_fkey"
            columns: ["database_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_databases"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["page_block_type"]
          content: Json
          created_at: string
          created_by: string
          id: string
          page_id: string
          position: number
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          block_type?: Database["public"]["Enums"]["page_block_type"]
          content?: Json
          created_at?: string
          created_by: string
          id?: string
          page_id: string
          position?: number
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["page_block_type"]
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          page_id?: string
          position?: number
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_id_workspace_id_fkey"
            columns: ["page_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_pages"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      page_favorites: {
        Row: {
          created_at: string
          id: string
          page_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_favorites_page_id_workspace_id_fkey"
            columns: ["page_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_pages"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      record_share_links: {
        Row: {
          created_at: string
          created_by: string
          id: string
          revoked_at: string | null
          row_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          revoked_at?: string | null
          row_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          revoked_at?: string | null
          row_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_share_links_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: true
            referencedRelation: "database_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      record_shares: {
        Row: {
          created_at: string
          created_by: string
          grantee_email: string
          grantee_user_id: string | null
          id: string
          permission: string
          revoked_at: string | null
          row_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          grantee_email: string
          grantee_user_id?: string | null
          id?: string
          permission: string
          revoked_at?: string | null
          row_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          grantee_email?: string
          grantee_user_id?: string | null
          id?: string
          permission?: string
          revoked_at?: string | null
          row_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_shares_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "database_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      row_comments: {
        Row: {
          body: string
          created_at: string
          database_id: string
          id: string
          row_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          database_id: string
          id?: string
          row_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          database_id?: string
          id?: string
          row_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "row_comments_row_id_database_id_workspace_id_fkey"
            columns: ["row_id", "database_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "database_rows"
            referencedColumns: ["id", "database_id", "workspace_id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          team_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          team_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          team_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_workspace_id_user_id_fkey"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_databases: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          team_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_databases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_databases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          intended_team_id: string | null
          invite_token: string
          invited_by: string
          last_sent_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["invite_status"]
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          intended_team_id?: string | null
          invite_token: string
          invited_by: string
          last_sent_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          intended_team_id?: string | null
          invite_token?: string
          invited_by?: string
          last_sent_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_intended_team_id_fkey"
            columns: ["intended_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_pages: {
        Row: {
          archived_at: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          icon: string | null
          id: string
          parent_page_id: string | null
          position: number
          team_id: string | null
          title: string
          updated_at: string
          updated_by: string
          visibility: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          parent_page_id?: string | null
          position?: number
          team_id?: string | null
          title?: string
          updated_at?: string
          updated_by: string
          visibility?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          parent_page_id?: string | null
          position?: number
          team_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_pages_parent_page_id_workspace_id_fkey"
            columns: ["parent_page_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_pages"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "workspace_pages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          updated_at: string
          who_can_create_collection: string
          who_can_create_page: string
          who_can_create_team: string
          who_can_invite: string
          workspace_id: string
        }
        Insert: {
          updated_at?: string
          who_can_create_collection?: string
          who_can_create_page?: string
          who_can_create_team?: string
          who_can_invite?: string
          workspace_id: string
        }
        Update: {
          updated_at?: string
          who_can_create_collection?: string
          who_can_create_page?: string
          who_can_create_team?: string
          who_can_invite?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { p_token_hash: string }
        Returns: {
          workspace_id: string
          workspace_slug: string
        }[]
      }
      add_shared_record_comment: {
        Args: { p_body: string; p_link_id: string }
        Returns: Json
      }
      create_workspace: {
        Args: {
          p_create_default_crm?: boolean
          p_name: string
          p_slug?: string
        }
        Returns: {
          database_id: string
          workspace_id: string
          workspace_slug: string
        }[]
      }
      create_workspace_database: {
        Args: {
          p_description?: string
          p_name: string
          p_team_id?: string
          p_view_type?: Database["public"]["Enums"]["database_view_type"]
          p_workspace_id: string
        }
        Returns: {
          database_id: string
          view_id: string
        }[]
      }
      delete_workspace: {
        Args: { p_name: string; p_workspace_id: string }
        Returns: undefined
      }
      ensure_record_share_link: { Args: { p_row_id: string }; Returns: string }
      get_collection_dashboard_data: {
        Args: { p_database_id: string }
        Returns: Json
      }
      get_crm_dashboard_metrics: {
        Args: { p_database_id: string }
        Returns: {
          closed: number
          closing: number
          follow_ups: number
          leads: number
          potential: number
          total_records: number
          total_revenue: number
        }[]
      }
      get_shared_record: { Args: { p_link_id: string }; Returns: Json }
      grant_record_share: {
        Args: { p_email: string; p_permission: string; p_row_id: string }
        Returns: {
          link_id: string
          share_id: string
        }[]
      }
      leave_workspace: { Args: { p_workspace_id: string }; Returns: undefined }
      list_record_shares: {
        Args: { p_row_id: string }
        Returns: {
          display_name: string
          email: string
          id: string
          is_owner: boolean
          permission: string
        }[]
      }
      query_database_rows: {
        Args: {
          p_database_id: string
          p_filters?: Json
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_workspace_id: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          created_by: string
          data: Json
          database_id: string
          id: string
          position: number
          updated_at: string
          updated_by: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "database_rows"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      revoke_record_share: { Args: { p_share_id: string }; Returns: undefined }
      seed_demo_crm: { Args: { p_database_id: string }; Returns: number }
      set_page_archived: {
        Args: { p_archived: boolean; p_page_id: string }
        Returns: number
      }
      update_record_share: {
        Args: { p_permission: string; p_share_id: string }
        Returns: undefined
      }
      update_shared_record_value: {
        Args: { p_link_id: string; p_property_id: string; p_value: Json }
        Returns: Json
      }
    }
    Enums: {
      database_property_type:
        | "title"
        | "text"
        | "number"
        | "currency"
        | "phone"
        | "email"
        | "date"
        | "datetime"
        | "select"
        | "multi_select"
        | "checkbox"
        | "person"
        | "multi_person"
        | "url"
      database_view_type: "table" | "board" | "calendar" | "gallery"
      invite_status: "pending" | "accepted" | "expired" | "cancelled"
      page_block_type:
        | "paragraph"
        | "heading_1"
        | "heading_2"
        | "heading_3"
        | "bulleted_list"
        | "numbered_list"
        | "todo"
        | "quote"
        | "callout"
        | "code"
        | "divider"
      workspace_role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      database_property_type: [
        "title",
        "text",
        "number",
        "currency",
        "phone",
        "email",
        "date",
        "datetime",
        "select",
        "multi_select",
        "checkbox",
        "person",
        "multi_person",
        "url",
      ],
      database_view_type: ["table", "board", "calendar", "gallery"],
      invite_status: ["pending", "accepted", "expired", "cancelled"],
      page_block_type: [
        "paragraph",
        "heading_1",
        "heading_2",
        "heading_3",
        "bulleted_list",
        "numbered_list",
        "todo",
        "quote",
        "callout",
        "code",
        "divider",
      ],
      workspace_role: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
    },
  },
} as const
