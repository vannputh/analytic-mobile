import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { Database } from "@/lib/database.types"

interface AuthenticatedRequestContext {
  supabase: SupabaseClient<Database>
  user: User
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null

  return token
}

async function createRequestClient(request: NextRequest): Promise<{ supabase: SupabaseClient<Database>; token?: string }> {
  const token = getBearerToken(request)

  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration")
    }

    const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { supabase, token }
  }

  const supabase = await createServerSupabaseClient()
  return { supabase }
}

export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<{ success: true; context: AuthenticatedRequestContext } | { success: false; response: NextResponse }> {
  try {
    const { supabase, token } = await createRequestClient(request)

    const { data, error } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser()

    if (error || !data.user) {
      return {
        success: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    return {
      success: true,
      context: {
        supabase,
        user: data.user
      }
    }
  } catch (error) {
    console.error("Authentication helper failure:", error)
    return {
      success: false,
      response: NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  }
}

export async function requireAdminUser(
  request: NextRequest
): Promise<{ success: true; context: AuthenticatedRequestContext } | { success: false; response: NextResponse }> {
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
      response: NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 })
    }
  }

  return auth
}
