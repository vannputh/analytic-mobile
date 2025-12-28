import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  
  // Always allow API routes through - never redirect them
  // API routes should handle their own authentication/authorization
  if (pathname.startsWith("/api")) {
    return supabaseResponse
  }

  // Public routes that don't require authentication
  const isPublicRoute = pathname.startsWith("/login") || 
                       pathname.startsWith("/auth")
  
  // Only redirect GET requests for page routes (not POST, PUT, DELETE, etc.)
  // API routes are already handled above
  if (!user && !isPublicRoute && request.method === "GET") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page (only GET requests)
  if (user && pathname === "/login" && request.method === "GET") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Remove browsing-topics from Permissions-Policy header to avoid warnings
  const permissionsPolicy = supabaseResponse.headers.get("Permissions-Policy")
  if (permissionsPolicy) {
    // Remove browsing-topics if present
    const policies = permissionsPolicy.split(",").map(p => p.trim())
    const filteredPolicies = policies.filter(p => !p.startsWith("browsing-topics"))
    if (filteredPolicies.length !== policies.length) {
      supabaseResponse.headers.set("Permissions-Policy", filteredPolicies.join(", "))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

