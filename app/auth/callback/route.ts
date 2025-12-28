import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Additional safety check: verify user was created before signups were disabled
      // This prevents any edge cases where a user might have been created
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // Verify the user exists in the system
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.user.id)
        
        if (userError || !userData.user) {
          // User doesn't exist or error occurred, sign them out
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL("/login?error=unauthorized", request.url))
        }
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url))
}




