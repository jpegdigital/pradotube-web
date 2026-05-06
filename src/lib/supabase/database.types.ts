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
  pradotube: {
    Tables: {
      channels: {
        Row: {
          avatar_path: string | null
          avg_duration_seconds: number | null
          avg_gap_days: number | null
          banner_url: string | null
          calibrated_at: string | null
          catalog_fraction: number
          created_at: string | null
          creator_id: string | null
          custom_url: string | null
          date_range_override: string | null
          description: string | null
          display_order: number | null
          duration_buckets: Json | null
          fetched_at: string | null
          last_full_refresh_at: string | null
          max_duration_seconds: number
          median_duration_seconds: number | null
          median_gap_days: number | null
          min_duration_override: number | null
          min_duration_seconds: number
          notes: string | null
          passing_min300: number | null
          passing_min300_max3600: number | null
          passing_min60: number | null
          passing_min60_max3600: number | null
          posts_per_week: number | null
          priority: number
          published_at: string | null
          scoring_alpha: number
          storage_budget_gb: number
          subscriber_count: number | null
          subscriber_count_hidden: boolean | null
          sync_mode: string
          thumbnail_url: string | null
          title: string
          total_videos_sampled: number | null
          video_count: number | null
          videos_fetched_at: string | null
          videos_in_date_range: number | null
          view_count: number | null
          youtube_id: string
        }
        Insert: {
          avatar_path?: string | null
          avg_duration_seconds?: number | null
          avg_gap_days?: number | null
          banner_url?: string | null
          calibrated_at?: string | null
          catalog_fraction?: number
          created_at?: string | null
          creator_id?: string | null
          custom_url?: string | null
          date_range_override?: string | null
          description?: string | null
          display_order?: number | null
          duration_buckets?: Json | null
          fetched_at?: string | null
          last_full_refresh_at?: string | null
          max_duration_seconds?: number
          median_duration_seconds?: number | null
          median_gap_days?: number | null
          min_duration_override?: number | null
          min_duration_seconds?: number
          notes?: string | null
          passing_min300?: number | null
          passing_min300_max3600?: number | null
          passing_min60?: number | null
          passing_min60_max3600?: number | null
          posts_per_week?: number | null
          priority?: number
          published_at?: string | null
          scoring_alpha?: number
          storage_budget_gb?: number
          subscriber_count?: number | null
          subscriber_count_hidden?: boolean | null
          sync_mode?: string
          thumbnail_url?: string | null
          title: string
          total_videos_sampled?: number | null
          video_count?: number | null
          videos_fetched_at?: string | null
          videos_in_date_range?: number | null
          view_count?: number | null
          youtube_id: string
        }
        Update: {
          avatar_path?: string | null
          avg_duration_seconds?: number | null
          avg_gap_days?: number | null
          banner_url?: string | null
          calibrated_at?: string | null
          catalog_fraction?: number
          created_at?: string | null
          creator_id?: string | null
          custom_url?: string | null
          date_range_override?: string | null
          description?: string | null
          display_order?: number | null
          duration_buckets?: Json | null
          fetched_at?: string | null
          last_full_refresh_at?: string | null
          max_duration_seconds?: number
          median_duration_seconds?: number | null
          median_gap_days?: number | null
          min_duration_override?: number | null
          min_duration_seconds?: number
          notes?: string | null
          passing_min300?: number | null
          passing_min300_max3600?: number | null
          passing_min60?: number | null
          passing_min60_max3600?: number | null
          posts_per_week?: number | null
          priority?: number
          published_at?: string | null
          scoring_alpha?: number
          storage_budget_gb?: number
          subscriber_count?: number | null
          subscriber_count_hidden?: boolean | null
          sync_mode?: string
          thumbnail_url?: string | null
          title?: string
          total_videos_sampled?: number | null
          video_count?: number | null
          videos_fetched_at?: string | null
          videos_in_date_range?: number | null
          view_count?: number | null
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_feed_candidates"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_feed_scored"
            referencedColumns: ["creator_id"]
          },
        ]
      }
      creators: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_order: number
          id: string
          name: string
          priority: number
          slug: string
          sort_name: string | null
          thumbnail_url: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name: string
          priority?: number
          slug: string
          sort_name?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          priority?: number
          slug?: string
          sort_name?: string | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      kid_devices: {
        Row: {
          created_at: string
          device_label: string | null
          device_secret_hash: string
          id: string
          kid_user_id: string
          last_seen_at: string | null
          parent_user_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          device_secret_hash: string
          id?: string
          kid_user_id: string
          last_seen_at?: string | null
          parent_user_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_label?: string | null
          device_secret_hash?: string
          id?: string
          kid_user_id?: string
          last_seen_at?: string | null
          parent_user_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      pairing_codes: {
        Row: {
          attempts: number
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          kid_user_id: string
          parent_user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          kid_user_id: string
          parent_user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kid_user_id?: string
          parent_user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_feed_candidates"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "user_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_feed_scored"
            referencedColumns: ["creator_id"]
          },
        ]
      }
      videos: {
        Row: {
          attempts: number
          categories: string[] | null
          channel_id: string
          chapters: Json | null
          comment_count: number | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          description: string | null
          discovered_at: string
          downloaded_at: string | null
          duration: string | null
          duration_seconds: number | null
          error: string | null
          fetched_at: string | null
          fps: number | null
          handle: string | null
          height: number | null
          info_json_synced_at: string | null
          is_downloaded: boolean
          language: string | null
          like_count: number | null
          media_path: string | null
          published_at: string | null
          r2_synced_at: string | null
          score: number | null
          source_tags: string[]
          started_at: string | null
          storage_bytes: number | null
          subtitle_path: string | null
          sync_tier: string | null
          tags: string[] | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string
          view_count: number | null
          webpage_url: string | null
          width: number | null
          youtube_id: string
        }
        Insert: {
          attempts?: number
          categories?: string[] | null
          channel_id: string
          chapters?: Json | null
          comment_count?: number | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          description?: string | null
          discovered_at?: string
          downloaded_at?: string | null
          duration?: string | null
          duration_seconds?: number | null
          error?: string | null
          fetched_at?: string | null
          fps?: number | null
          handle?: string | null
          height?: number | null
          info_json_synced_at?: string | null
          is_downloaded?: boolean
          language?: string | null
          like_count?: number | null
          media_path?: string | null
          published_at?: string | null
          r2_synced_at?: string | null
          score?: number | null
          source_tags?: string[]
          started_at?: string | null
          storage_bytes?: number | null
          subtitle_path?: string | null
          sync_tier?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title: string
          view_count?: number | null
          webpage_url?: string | null
          width?: number | null
          youtube_id: string
        }
        Update: {
          attempts?: number
          categories?: string[] | null
          channel_id?: string
          chapters?: Json | null
          comment_count?: number | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          description?: string | null
          discovered_at?: string
          downloaded_at?: string | null
          duration?: string | null
          duration_seconds?: number | null
          error?: string | null
          fetched_at?: string | null
          fps?: number | null
          handle?: string | null
          height?: number | null
          info_json_synced_at?: string | null
          is_downloaded?: boolean
          language?: string | null
          like_count?: number | null
          media_path?: string | null
          published_at?: string | null
          r2_synced_at?: string | null
          score?: number | null
          source_tags?: string[]
          started_at?: string | null
          storage_bytes?: number | null
          subtitle_path?: string | null
          sync_tier?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string
          view_count?: number | null
          webpage_url?: string | null
          width?: number | null
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      watch_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_seconds: number | null
          id: string
          last_position: number
          previous_video_id: string | null
          session_end: string | null
          session_start: string
          source: string
          total_watch_time: number
          unique_seconds: number
          updated_at: string
          user_id: string
          video_id: string
          watched_ranges: Json
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_position?: number
          previous_video_id?: string | null
          session_end?: string | null
          session_start?: string
          source?: string
          total_watch_time?: number
          unique_seconds?: number
          updated_at?: string
          user_id: string
          video_id: string
          watched_ranges?: Json
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_position?: number
          previous_video_id?: string | null
          session_end?: string | null
          session_start?: string
          source?: string
          total_watch_time?: number
          unique_seconds?: number
          updated_at?: string
          user_id?: string
          video_id?: string
          watched_ranges?: Json
        }
        Relationships: []
      }
    }
    Views: {
      user_feed_candidates: {
        Row: {
          channel_id: string | null
          channel_priority: number | null
          creator_avatar_path: string | null
          creator_channel_count: number | null
          creator_id: string | null
          creator_name: string | null
          creator_priority: number | null
          creator_slug: string | null
          duration_seconds: number | null
          like_count: number | null
          published_at: string | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string | null
          video_id: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
      user_feed_scored: {
        Row: {
          channel_id: string | null
          channel_priority: number | null
          creator_avatar_path: string | null
          creator_channel_count: number | null
          creator_id: string | null
          creator_name: string | null
          creator_priority: number | null
          creator_rank: number | null
          creator_slug: string | null
          duration_seconds: number | null
          feed_rank: number | null
          freshness: number | null
          jitter: number | null
          like_count: number | null
          priority_norm: number | null
          published_at: string | null
          rel_recency: number | null
          score: number | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string | null
          video_id: string | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["youtube_id"]
          },
        ]
      }
    }
    Functions: {
      claim_next_job: {
        Args: {
          p_channel_id: string
          p_max_attempts: number
          p_max_duration: number
          p_min_duration: number
          p_sort_key?: string
        }
        Returns: {
          attempts: number
          categories: string[] | null
          channel_id: string
          chapters: Json | null
          comment_count: number | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          description: string | null
          discovered_at: string
          downloaded_at: string | null
          duration: string | null
          duration_seconds: number | null
          error: string | null
          fetched_at: string | null
          fps: number | null
          handle: string | null
          height: number | null
          info_json_synced_at: string | null
          is_downloaded: boolean
          language: string | null
          like_count: number | null
          media_path: string | null
          published_at: string | null
          r2_synced_at: string | null
          score: number | null
          source_tags: string[]
          started_at: string | null
          storage_bytes: number | null
          subtitle_path: string | null
          sync_tier: string | null
          tags: string[] | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string
          view_count: number | null
          webpage_url: string | null
          width: number | null
          youtube_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "videos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      compute_unique_seconds: { Args: { p_ranges: Json }; Returns: number }
      consume_pairing_code: {
        Args: {
          p_code: string
          p_device_label: string
          p_device_secret_hash: string
          p_user_agent: string
        }
        Returns: {
          device_id: string
          kid_user_id: string
        }[]
      }
      continue_watching_for_user: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          coverage_pct: number
          creator_avatar_url: string
          creator_id: string
          creator_name: string
          duration_seconds: number
          last_position: number
          media_path: string
          session_id: string
          session_start: string
          thumbnail_url: string
          title: string
          unique_seconds: number
          video_id: string
        }[]
      }
      fail_video_atomic: {
        Args: { p_error: string; p_video_id: string }
        Returns: undefined
      }
      feed_for_user: {
        Args: {
          p_creator_id?: string
          p_limit?: number
          p_offset?: number
          p_search_text?: string
          p_user_id: string
        }
        Returns: {
          channel_title: string
          comment_count: number
          creator_avatar_url: string
          creator_id: string
          creator_name: string
          creator_priority: number
          creator_slug: string
          duration_seconds: number
          fps: number
          height: number
          like_count: number
          media_path: string
          published_at: string
          score: number
          tags: string[]
          thumbnail_url: string
          title: string
          video_id: string
          view_count: number
          width: number
        }[]
      }
      get_distinct_video_channel_ids: {
        Args: never
        Returns: {
          channel_id: string
        }[]
      }
      list_users: {
        Args: never
        Returns: {
          email: string
          first_name: string
          id: string
          is_admin: boolean
          last_name: string
        }[]
      }
      merge_ranges: { Args: { p_ranges: Json }; Returns: Json }
      revoke_kid_device: { Args: { p_device_id: string }; Returns: undefined }
      search_creators: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
          priority: number
          slug: string
        }[]
      }
      search_videos: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          channel_title: string
          comment_count: number
          creator_avatar_url: string
          creator_id: string
          creator_name: string
          creator_priority: number
          creator_slug: string
          duration_seconds: number
          fps: number
          height: number
          like_count: number
          media_path: string
          published_at: string
          score: number
          tags: string[]
          thumbnail_url: string
          title: string
          video_id: string
          view_count: number
          width: number
        }[]
      }
      touch_kid_device: { Args: { p_device_id: string }; Returns: undefined }
      upsert_watch_heartbeat: {
        Args: {
          p_duration?: number
          p_elapsed?: number
          p_new_range?: Json
          p_position?: number
          p_previous_video_id?: string
          p_session_id?: string
          p_source?: string
          p_user_id: string
          p_video_id: string
        }
        Returns: string
      }
      video_counts_by_channel: {
        Args: never
        Returns: {
          channel_id: string
          downloaded: number
          uploaded: number
        }[]
      }
      watch_history_for_user: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          completed: boolean
          coverage_pct: number
          creator_avatar_url: string
          creator_name: string
          duration_seconds: number
          last_position: number
          session_end: string
          session_id: string
          session_start: string
          source: string
          thumbnail_url: string
          title: string
          total_watch_time: number
          unique_seconds: number
          video_id: string
          watched_ranges: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  pradotube: {
    Enums: {},
  },
} as const
