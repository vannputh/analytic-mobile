import { createClient } from "@/lib/supabase/client"

/**
 * Get a user preference from Supabase
 */
export async function getUserPreference<T = any>(key: string): Promise<T | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await (supabase
    .from("user_preferences" as any) as any)
    .select("preference_value")
    .eq("user_id", user.id)
    .eq("preference_key", key)
    .single()

  if (error || !data) return null

  return data.preference_value as T
}

/**
 * Set a user preference in Supabase
 */
export async function setUserPreference<T = any>(key: string, value: T): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { error } = await (supabase
    .from("user_preferences" as any) as any)
    .upsert({
      user_id: user.id,
      preference_key: key,
      preference_value: value as any,
    }, {
      onConflict: "user_id,preference_key"
    })

  return !error
}









