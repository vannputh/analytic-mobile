import { supabase } from "@/src/shared/api/supabase"

export async function getUserPreference<T = unknown>(key: string): Promise<T | null> {
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from("user_preferences" as never)
    .select("preference_value")
    .eq("user_id", userId)
    .eq("preference_key", key)
    .single()

  if (error || !data) return null
  return (data as { preference_value: T }).preference_value
}

export async function setUserPreference<T = unknown>(key: string, value: T): Promise<boolean> {
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id
  if (!userId) return false

  const { error } = await supabase
    .from("user_preferences" as never)
    .upsert(
      {
        user_id: userId,
        preference_key: key,
        preference_value: value
      } as never,
      {
        onConflict: "user_id,preference_key"
      }
    )

  return !error
}
