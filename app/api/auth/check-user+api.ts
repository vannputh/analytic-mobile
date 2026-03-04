import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/src/server/database.types'
import { getServerSupabaseUrl, getSupabaseServiceRoleKey } from '@/src/server/env'
import type { CheckUserRequest, CheckUserResponse } from "@analytics/contracts"

const USER_LOOKUP_PAGE_SIZE = 200
const MAX_USER_LOOKUP_PAGES = 50

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

// This route checks if a user exists in Supabase Auth and their approval status
export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as CheckUserRequest

    const normalizedEmail = normalizeEmail(email ?? "")
    if (!normalizedEmail) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Use service role key to access auth.users table
    const supabaseUrl = getServerSupabaseUrl()
    const supabaseServiceRoleKey = getSupabaseServiceRoleKey()

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      const missingVars = []
      if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
      if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
      
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
      return Response.json(
        { 
          error: 'Server configuration error',
          details: `Missing environment variables: ${missingVars.join(', ')}.`
        },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fast path: profile lookup avoids scanning paginated auth user lists.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('status')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (profileError) {
      console.error('Error checking user profile:', profileError)
      return Response.json(
        { error: 'Failed to check user profile' },
        { status: 500 }
      )
    }

    if (profile) {
      const payload: CheckUserResponse = {
        exists: true,
        approved: profile.status === 'approved',
        status: profile.status
      }
      return Response.json(payload)
    }

    // Fallback for older/migrated accounts that exist in auth but do not have a profile row yet.
    for (let page = 1; page <= MAX_USER_LOOKUP_PAGES; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: USER_LOOKUP_PAGE_SIZE
      })

      if (error) {
        console.error('Error checking auth users:', error)
        return Response.json(
          { error: 'Failed to check user' },
          { status: 500 }
        )
      }

      const hasAuthUser = data.users.some(user =>
        user.email?.toLowerCase().trim() === normalizedEmail
      )
      if (hasAuthUser) {
        const payload: CheckUserResponse = {
          exists: true,
          approved: false,
          status: 'unknown'
        }
        return Response.json(payload)
      }

      const reachedLastPage =
        data.users.length < USER_LOOKUP_PAGE_SIZE ||
        (typeof data.lastPage === 'number' && data.lastPage > 0 && page >= data.lastPage)
      if (reachedLastPage) break
    }

    const payload: CheckUserResponse = { exists: false }
    return Response.json(payload)
  } catch (error) {
    console.error('Error in check-user route:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
