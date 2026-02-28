export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined }

export interface MediaEntry {
  id: string
  user_id: string
  title: string
  medium: string | null
  type: string | null
  status: string | null
  genre: string[] | null
  platform: string | null
  language: string[] | null
  start_date: string | null
  finish_date: string | null
  my_rating: number | null
  average_rating: number | null
  rating: number | null
  price: number | null
  length: string | null
  episodes: number | null
  episodes_watched: number | null
  episode_history: JsonValue | null
  last_watched_at: string | null
  season: string | null
  time_taken: string | null
  poster_url: string | null
  imdb_id: string | null
  created_at: string
  updated_at: string
}

export interface MediaStatusHistory {
  id: string
  media_entry_id: string
  old_status: string | null
  new_status: string
  changed_at: string
  notes: string | null
  created_at: string
  user_id: string
}

export interface FoodItem {
  name: string
  price: number | null
  image_url: string | null
  category: string | null
  categories?: string[] | null
}

export interface FoodEntryImage {
  id: string
  food_entry_id: string
  storage_path: string
  image_url: string
  is_primary: boolean
  caption: string | null
  user_id: string
  created_at: string
}

export interface FoodEntry {
  id: string
  user_id: string
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
  items_ordered: FoodItem[] | null
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
  primary_image_url?: string | null
  images?: FoodEntryImage[]
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  status: "pending" | "approved" | "rejected"
  is_admin: boolean
  requested_at: string
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface AppDatabase {
  public: {
    Tables: {
      media_entries: {
        Row: MediaEntry
        Insert: Omit<MediaEntry, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<MediaEntry, "id">>
      }
      media_status_history: {
        Row: MediaStatusHistory
        Insert: Omit<MediaStatusHistory, "id" | "created_at"> & { id?: string; created_at?: string }
        Update: Partial<Omit<MediaStatusHistory, "id">>
      }
      food_entries: {
        Row: FoodEntry
        Insert: Omit<FoodEntry, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<FoodEntry, "id">>
      }
      food_entry_images: {
        Row: FoodEntryImage
        Insert: Omit<FoodEntryImage, "id" | "created_at" | "user_id"> & { id?: string; created_at?: string; user_id?: string }
        Update: Partial<Omit<FoodEntryImage, "id">>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<UserProfile, "id">>
      }
    }
  }
}
