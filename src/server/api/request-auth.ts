import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

import type { Database } from "@/src/server/database.types"
import { getServerSupabaseAnonKey, getServerSupabaseUrl } from "@/src/server/env"

interface AuthenticatedRequestContext {
  supabase: SupabaseClient<Database>
  user: User
}

type AuthSuccess = { success: true; context: AuthenticatedRequestContext }
type AuthFailure = { success: false; response: Response }

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null

  return token
}

function createRequestClient(token: string): SupabaseClient<Database> {
  const supabaseUrl = getServerSupabaseUrl()
  const supabaseAnonKey = getServerSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthSuccess | AuthFailure> {
  const token = getBearerToken(request)
  if (!token) {
    return {
      success: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  try {
    const supabase = createRequestClient(token)
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return {
        success: false,
        response: Response.json({ error: "Unauthorized" }, { status: 401 }),
      }
    }

    return {
      success: true,
      context: {
        supabase,
        user: data.user,
      },
    }
  } catch (error) {
    console.error("Authentication helper failure:", error)
    return {
      success: false,
      response: Response.json({ error: "Authentication failed" }, { status: 401 }),
    }
  }
}

export async function requireAdminUser(request: Request): Promise<AuthSuccess | AuthFailure> {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.success) return auth

  const { supabase, user } = auth.context

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return {
      success: false,
      response: Response.json({ error: "Forbidden: admin access required" }, { status: 403 }),
    }
  }

  return auth
}
