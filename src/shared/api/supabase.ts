import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env, getClientEnvError } from "@/src/shared/config/env"
import { supabaseStorage } from "@/src/shared/storage/supabase-storage"

const supabaseInitializationError = getClientEnvError()

function createUnavailableClient(error: Error): SupabaseClient<any> {
  const fail = (): never => {
    throw new Error(`Supabase client is unavailable.\n${error.message}`)
  }

  const unavailableMember = new Proxy(fail as unknown as object, {
    get: () => fail,
    apply: () => fail()
  })

  return new Proxy({} as SupabaseClient<any>, {
    get: () => unavailableMember
  })
}

export const supabase = supabaseInitializationError
  ? createUnavailableClient(supabaseInitializationError)
  : createClient<any>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: supabaseStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })

export function getSupabaseInitializationError(): Error | null {
  return supabaseInitializationError
}
