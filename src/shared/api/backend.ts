import { supabase } from "@/src/shared/api/supabase"
import { env } from "@/src/shared/config/env"

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
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      ;(requestHeaders as Record<string, string>).Authorization = `Bearer ${token}`
    }
  }

  const targetUrl = `${env.backendUrl}${path}`
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
        baseUrl: env.backendUrl,
        targetUrl,
        error
      })
    }
    throw new Error(
      `Cannot reach backend at ${env.backendUrl}. Start it with "bun run backend:dev" and verify EXPO_PUBLIC_BACKEND_URL.`
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
