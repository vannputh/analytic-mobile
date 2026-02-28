import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isApiRoute = pathname.startsWith("/api")
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$/.test(pathname)

  if (isApiRoute || isStaticAsset) {
    return NextResponse.next({ request })
  }

  return NextResponse.json(
    {
      error: "This backend is API-only. Use /api/* routes from the mobile client."
    },
    { status: 404 }
  )
}

export const config = {
  matcher: ["/:path*"]
}
