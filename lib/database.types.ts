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

export type BookEntry = {
  id: string
  title: string
  author: string | null
  publisher: string | null
  isbn: string | null
  pages: number | null
  format: string | null
  genre: string[] | null
  language: string[] | null
  series_name: string | null
  series_number: number | null
  status: string | null
  platform: string | null
  price: number | null
  my_rating: number | null
  average_rating: number | null
  start_date: string | null
  finish_date: string | null
  notes: string | null
  cover_url: string | null
  goodreads_id: string | null
  created_at: string
  updated_at: string
}

export type MusicEntry = {
  id: string
  title: string
  artist: string | null
  album: string | null
  type: string | null
  duration_minutes: number | null
  genre: string[] | null
  release_date: string | null
  platform: string | null
  status: string | null
  price: number | null
  my_rating: number | null
  listen_count: number | null
  spotify_id: string | null
  apple_music_id: string | null
  cover_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      book_entries: {
        Row: BookEntry
        Insert: Omit<BookEntry, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<BookEntry, 'id'>>
      }
      music_entries: {
        Row: MusicEntry
        Insert: Omit<MusicEntry, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<MusicEntry, 'id'>>
      }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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

// Book types
export type BookEntryInsert = Database['public']['Tables']['book_entries']['Insert']
export type BookEntryUpdate = Database['public']['Tables']['book_entries']['Update']

// Music types
export type MusicEntryInsert = Database['public']['Tables']['music_entries']['Insert']
export type MusicEntryUpdate = Database['public']['Tables']['music_entries']['Update']

// Item ordered with optional price, image, and category
export type ItemOrdered = {
  name: string
  price: number | null
  image_url: string | null
  category: string | null
  categories?: string[] | null
}

// Food entry type
export type FoodEntry = {
  id: string
  name: string
  branch: string | null
  visit_date: string
  category: string | null
  address: string | null
  google_maps_url: string | null
  latitude: number | null
  longitude: number | null
  neighborhood: string | null
  city: string | null
  country: string | null
  instagram_handle: string | null
  website_url: string | null
  primary_image_url?: string | null
  images?: FoodEntryImage[]
  items_ordered: ItemOrdered[] | null
  favorite_item: string | null
  overall_rating: number | null
  food_rating: number | null
  ambiance_rating: number | null
  service_rating: number | null
  value_rating: number | null
  total_price: number | null
  currency: string | null
  price_level: string | null
  cuisine_type: string[] | null
  dining_type: string | null
  tags: string[] | null
  would_return: boolean | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type FoodEntryInsert = Omit<FoodEntry, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type FoodEntryUpdate = Partial<Omit<FoodEntry, 'id'>>

// Food entry image type
export type FoodEntryImage = {
  id: string
  food_entry_id: string
  storage_path: string
  image_url: string
  is_primary: boolean
  caption: string | null
  created_at: string
}

export type FoodEntryImageInsert = Omit<FoodEntryImage, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

// Medium types for filtering
export const VISUAL_MEDIA_TYPES = ["Movie", "TV Show", "Podcast", "Live Theatre"] as const
export const TEXT_MEDIA_TYPES = [] as const // Books moved to separate table
export const ALL_MEDIUM_TYPES = ["Movie", "TV Show", "Game", "Podcast", "Live Theatre"] as const

export type VisualMediaType = (typeof VISUAL_MEDIA_TYPES)[number]
export type TextMediaType = (typeof TEXT_MEDIA_TYPES)[number]
export type MediumType = (typeof ALL_MEDIUM_TYPES)[number]
