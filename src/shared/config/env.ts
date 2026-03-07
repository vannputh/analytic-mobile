import Constants from "expo-constants"
import { Platform } from "react-native"

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const hasWrappedDoubleQuotes = trimmed.startsWith("\"") && trimmed.endsWith("\"")
  const hasWrappedSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'")
  const unquoted = (hasWrappedDoubleQuotes || hasWrappedSingleQuotes) ? trimmed.slice(1, -1).trim() : trimmed

  return unquoted || undefined
}

function getExtraValue(key: string): string | undefined {
  const value = Constants.expoConfig?.extra?.[key]
  return typeof value === "string" ? normalizeEnvValue(value) : undefined
}

function getEnvValue(key: string): string | undefined {
  const processValue = normalizeEnvValue((process.env as Record<string, string | undefined>)[key])
  if (processValue !== undefined) return processValue
  return getExtraValue(key)
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function parseOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
    const parsed = new URL(withScheme)
    const protocol = (parsed.protocol === "https:" || parsed.protocol === "exps:") ? "https:" : "http:"
    return `${protocol}//${parsed.host}`
  } catch {
    return null
  }
}

function getExpoRuntimeOrigin(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost,
    Constants.linkingUri
  ]

  let fallbackLoopbackOrigin: string | null = null

  for (const candidate of candidates) {
    if (!candidate) continue
    const origin = parseOrigin(candidate)
    if (!origin) continue

    const hostname = new URL(origin).hostname
    if (!isLoopbackHost(hostname)) {
      return origin
    }
    fallbackLoopbackOrigin = fallbackLoopbackOrigin ?? origin
  }

  return fallbackLoopbackOrigin
}

function resolveApiUrl(rawValue: string): string {
  const fallbackOrigin = getExpoRuntimeOrigin() ?? "http://puths-book.local:8081"
  const initialValue = rawValue || fallbackOrigin

  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production"
  if (!isDev) return initialValue.replace(/\/$/, "")

  // iOS simulators can reach localhost directly, so keep loopback values there.
  // For physical devices and Android emulators, keep LAN-host rewrite behavior.
  if (!Constants.isDevice && Platform.OS === "ios") {
    return initialValue.replace(/\/$/, "")
  }

  let parsed: URL
  try {
    parsed = new URL(initialValue)
  } catch {
    return initialValue
  }

  if (!isLoopbackHost(parsed.hostname)) {
    return parsed.toString().replace(/\/$/, "")
  }

  const runtimeOrigin = getExpoRuntimeOrigin()
  if (!runtimeOrigin) {
    return parsed.toString().replace(/\/$/, "")
  }

  const runtimeHost = new URL(runtimeOrigin).hostname
  if (isLoopbackHost(runtimeHost)) {
    return parsed.toString().replace(/\/$/, "")
  }

  parsed.hostname = runtimeHost
  return parsed.toString().replace(/\/$/, "")
}

function shouldPreferExpoRuntimeApiUrl(): boolean {
  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production"
  if (!isDev) return false
  if (Platform.OS === "web") return false
  return Boolean(getExpoRuntimeOrigin())
}

const explicitApiUrl =
  getEnvValue("EXPO_PUBLIC_API_URL")
  ?? ""

const legacyApiUrl =
  getEnvValue("EXPO_PUBLIC_BACKEND_URL")
  ?? getExtraValue("apiUrl")
  ?? getExtraValue("backendUrl")
  ?? ""

const configuredApiUrl = shouldPreferExpoRuntimeApiUrl()
  ? ""
  : (explicitApiUrl || legacyApiUrl)

const resolvedApiUrl = resolveApiUrl(configuredApiUrl)

const configuredSupabaseUrl =
  getEnvValue("EXPO_PUBLIC_SUPABASE_URL")
  ?? getEnvValue("NEXT_PUBLIC_SUPABASE_URL")
  ?? getExtraValue("supabaseUrl")
  ?? getExtraValue("NEXT_PUBLIC_SUPABASE_URL")
  ?? ""

const configuredSupabaseAnonKey =
  getEnvValue("EXPO_PUBLIC_SUPABASE_ANON_KEY")
  ?? getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ?? getExtraValue("supabaseAnonKey")
  ?? getExtraValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ?? ""

export const env = {
  supabaseUrl: configuredSupabaseUrl,
  supabaseAnonKey: configuredSupabaseAnonKey,
  apiUrl: resolvedApiUrl,
  // Kept for compatibility with existing call sites during migration.
  backendUrl: resolvedApiUrl
}

function validateHttpUrlEnv(key: string, value: string): string | null {
  if (/[\r\n]/.test(value)) {
    return `${key} contains a newline. Set it to a single-line URL (for example: https://example.com).`
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return `${key} is not a valid URL. Set it to a full URL (for example: https://example.com).`
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `${key} must start with http:// or https://.`
  }

  return null
}

function validateTokenEnv(key: string, value: string): string | null {
  if (/[\r\n]/.test(value)) {
    return `${key} contains a newline. Set it to a single-line token.`
  }

  if (/\s/.test(value)) {
    return `${key} contains whitespace. Set it to the raw token value with no spaces.`
  }

  return null
}

function getEnvErrors(): string[] {
  const missing: string[] = []
  const invalid: string[] = []

  if (!env.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)")
  else {
    const issue = validateHttpUrlEnv("EXPO_PUBLIC_SUPABASE_URL", env.supabaseUrl)
    if (issue) invalid.push(issue)
  }

  if (!env.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)")
  else {
    const issue = validateTokenEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", env.supabaseAnonKey)
    if (issue) invalid.push(issue)
  }

  if (!env.apiUrl) missing.push("EXPO_PUBLIC_API_URL")
  else {
    const issue = validateHttpUrlEnv("EXPO_PUBLIC_API_URL", env.apiUrl)
    if (issue) invalid.push(issue)
  }

  const errors: string[] = []

  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(", ")}`)
  }

  if (invalid.length > 0) {
    errors.push(`Invalid environment variables:\n- ${invalid.join("\n- ")}`)
  }

  return errors
}

export function getClientEnvError(): Error | null {
  const errors = getEnvErrors()
  if (errors.length === 0) return null
  return new Error(errors.join("\n"))
}

export function assertEnv(): void {
  const error = getClientEnvError()

  if (error) {
    throw error
  }
}
