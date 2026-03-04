import { env } from "@/src/shared/config/env"
import { getSessionSnapshot } from "@/src/shared/api/session"

interface RequestOptions extends RequestInit {
  authenticated?: boolean
}

export async function backendFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { authenticated = true, headers, ...rest } = options

  const isFormDataBody =
    typeof FormData !== "undefined" && rest.body instanceof FormData

  const requestHeaders: HeadersInit = {
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
    ...(headers ?? {})
  }

  if (authenticated) {
    const { session, status } = await getSessionSnapshot()
    if (status !== "resolved" && typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn(`[backendFetch] getSessionSnapshot returned ${status}; sending request without auth token`)
    }
    const token = session?.access_token
    if (token) {
      ;(requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`
    }
  }

  const targetUrl = `${env.apiUrl}${path}`
  let response: Response
  try {
    response = await fetch(targetUrl, {
      ...rest,
      headers: requestHeaders
    })
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.error("[backendFetch] Network error", {
        path,
        baseUrl: env.apiUrl,
        targetUrl,
        error
      })
    }
    throw new Error(
      `Cannot reach API routes at ${env.apiUrl}. Start Expo with "bun run dev" and verify EXPO_PUBLIC_API_URL (or EXPO_PUBLIC_BACKEND_URL for fallback compatibility).`
    )
  }

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMessage = (json && typeof json.error === "string") ? json.error : null
    const detailsMessage = (json && typeof json.details === "string") ? json.details : null
    const message = errorMessage
      ? (detailsMessage ? `${errorMessage}: ${detailsMessage}` : errorMessage)
      : `Request failed (${response.status})`
    throw new Error(message)
  }

  return json as T
}
