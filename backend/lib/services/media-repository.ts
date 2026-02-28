import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, MediaEntry } from "@/lib/database.types"

export interface MediaActionPayload {
  title?: string
  medium?: string
  type?: string
  status?: string
  genre?: string[]
  platform?: string
  my_rating?: number
  start_date?: string
  finish_date?: string
  language?: string[]
  episodes?: number
  episodes_watched?: number
  price?: number
}

export async function findMediaEntryByTitle(
  supabase: SupabaseClient<Database>,
  userId: string,
  title: string
): Promise<MediaEntry | null> {
  const normalized = title.trim()
  if (!normalized) return null

  const { data: exactMatch } = await (supabase
    .from("media_entries" as any) as any)
    .select("*")
    .eq("user_id", userId)
    .ilike("title", normalized)
    .limit(1)
    .maybeSingle()

  if (exactMatch) {
    return exactMatch as MediaEntry
  }

  const { data: fuzzyMatches } = await (supabase
    .from("media_entries" as any) as any)
    .select("*")
    .eq("user_id", userId)
    .ilike("title", `%${normalized}%`)
    .limit(1)

  if (fuzzyMatches && fuzzyMatches.length > 0) {
    return fuzzyMatches[0] as MediaEntry
  }

  return null
}

export async function createMediaEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: MediaActionPayload
): Promise<{ success: true; data: MediaEntry } | { success: false; error: string }> {
  if (!payload.title?.trim()) {
    return { success: false, error: "Title is required for create action" }
  }

  const insertPayload = {
    ...payload,
    title: payload.title.trim(),
    user_id: userId
  }

  const { data, error } = await (supabase
    .from("media_entries" as any) as any)
    .insert(insertPayload)
    .select("*")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as MediaEntry }
}

export async function updateMediaEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  payload: MediaActionPayload
): Promise<{ success: true; data: MediaEntry } | { success: false; error: string }> {
  const { data, error } = await (supabase
    .from("media_entries" as any) as any)
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as MediaEntry }
}

export async function deleteMediaEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await supabase
    .from("media_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
