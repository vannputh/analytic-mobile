import { createClient } from "@supabase/supabase-js"
import { env } from "@/src/shared/config/env"
import { supabaseStorage } from "@/src/shared/storage/supabase-storage"

export const supabase = createClient<any>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})
