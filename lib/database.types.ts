export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Episode watch history record
export interface EpisodeWatchRecord {
  episode: number;
  watched_at: string;
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      media_entries: {
        Row: {
          average_rating: number | null
          created_at: string
          episodes: number | null
          episodes_watched: number | null
          episode_history: Json | null
          last_watched_at: string | null
          finish_date: string | null
          genre: string[] | null
          id: string
          imdb_id: string | null
          language: string[] | null
          length: string | null
          medium: string | null
          my_rating: number | null
          platform: string | null
          poster_url: string | null
          price: number | null
          rating: number | null
          season: string | null
          start_date: string | null
          status: string | null
          time_taken: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          episodes?: number | null
          episodes_watched?: number | null
          episode_history?: Json | null
          last_watched_at?: string | null
          finish_date?: string | null
          genre?: string[] | null
          id?: string
          imdb_id?: string | null
          language?: string[] | null
          length?: string | null
          medium?: string | null
          my_rating?: number | null
          platform?: string | null
          poster_url?: string | null
          price?: number | null
          rating?: number | null
          season?: string | null
          start_date?: string | null
          status?: string | null
          time_taken?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          episodes?: number | null
          episodes_watched?: number | null
          episode_history?: Json | null
          last_watched_at?: string | null
          finish_date?: string | null
          genre?: string[] | null
          id?: string
          imdb_id?: string | null
          language?: string[] | null
          length?: string | null
          medium?: string | null
          my_rating?: number | null
          platform?: string | null
          poster_url?: string | null
          price?: number | null
          rating?: number | null
          season?: string | null
          start_date?: string | null
          status?: string | null
          time_taken?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_status_history: {
        Row: {
          id: string
          media_entry_id: string
          old_status: string | null
          new_status: string
          changed_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          media_entry_id: string
          old_status?: string | null
          new_status: string
          changed_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          media_entry_id?: string
          old_status?: string | null
          new_status?: string
          changed_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_status_history_media_entry_id_fkey"
            columns: ["media_entry_id"]
            referencedRelation: "media_entries"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preference_key: string
          preference_value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preference_key: string
          preference_value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preference_key?: string
          preference_value?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// Convenience type aliases
export type MediaEntry = Tables<"media_entries">
export type MediaEntryInsert = TablesInsert<"media_entries">
export type MediaEntryUpdate = TablesUpdate<"media_entries">
export type MediaStatusHistory = Tables<"media_status_history">
export type MediaStatusHistoryInsert = TablesInsert<"media_status_history">
export type MediaStatusHistoryUpdate = TablesUpdate<"media_status_history">
export type UserPreference = Tables<"user_preferences">
export type UserPreferenceInsert = TablesInsert<"user_preferences">
export type UserPreferenceUpdate = TablesUpdate<"user_preferences">

// Medium types for filtering
export const VISUAL_MEDIA_TYPES = ["Movie", "TV Show", "Podcast"] as const
export const TEXT_MEDIA_TYPES = ["Book"] as const
export const ALL_MEDIUM_TYPES = ["Movie", "TV Show", "Book", "Game", "Podcast", "Live Theatre"] as const

export type VisualMediaType = (typeof VISUAL_MEDIA_TYPES)[number]
export type TextMediaType = (typeof TEXT_MEDIA_TYPES)[number]
export type MediumType = (typeof ALL_MEDIUM_TYPES)[number]
