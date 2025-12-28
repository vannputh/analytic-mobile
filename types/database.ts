export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      media_entries: {
        Row: MediaEntry
        Insert: Omit<MediaEntry, 'id'> & { id?: string }
        Update: Partial<Omit<MediaEntry, 'id'>>
      }
    }
  }
}

export type MediaEntry = {
  id: string
  title: string
  medium: Medium | null
  type: string | null
  season: string | null
  episodes: number | null
  length: string | null
  price: number | null
  language: string | null
  platform: Platform | null
  status: Status | null
  genre: string | null
  rating: number | null // Legacy rating column
  average_rating: number | null
  my_rating: number | null
  start_date: string | null
  finish_date: string | null
  time_taken: string | null
  poster_url: string | null
  imdb_id: string | null
  created_at: string
  updated_at: string
}

export type Medium = 'Movie' | 'TV Show' | 'Book' | 'Theatre' | 'Live Theatre' | 'Podcast'

export type Platform = 
  | 'Netflix' 
  | 'AppleTV' 
  | 'Prime Video'
  | 'Disney+'
  | 'HBO Max'
  | 'Hulu'
  | 'Pirated' 
  | 'Cinema'
  | 'Physical'
  | 'Spotify'
  | 'YouTube'
  | 'Other'

export type Status = 'In Progress' | 'Finished' | 'On Hold' | 'Dropped'

