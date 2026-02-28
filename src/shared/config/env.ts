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

function parseHost(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed).hostname
  } catch {
    const withoutScheme = trimmed.replace(/^[a-zA-Z]+:\/\//, "")
    const authority = withoutScheme.split("/")[0] ?? ""
    const host = authority.split(":")[0] ?? ""
    return host || null
  }
}

function getExpoRuntimeHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost,
    Constants.linkingUri
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const host = parseHost(candidate)
    if (host && !isLoopbackHost(host)) {
      return host
    }
  }

  return null
}

function resolveBackendUrl(rawValue: string): string {
  if (!rawValue) return rawValue

  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production"
  if (!isDev) return rawValue

  // iOS simulators can reach localhost directly, so keep loopback values there.
  // For physical devices and Android emulators, keep LAN-host rewrite behavior.
  if (!Constants.isDevice && Platform.OS === "ios") {
    return rawValue
  }

  let parsed: URL
  try {
    parsed = new URL(rawValue)
  } catch {
    return rawValue
  }

  if (!isLoopbackHost(parsed.hostname)) {
    return rawValue
  }

  const runtimeHost = getExpoRuntimeHost()
  if (!runtimeHost) {
    return rawValue
  }

  parsed.hostname = runtimeHost
  return parsed.toString().replace(/\/$/, "")
}

const configuredBackendUrl =
  getEnvValue("EXPO_PUBLIC_BACKEND_URL") ?? getExtraValue("backendUrl") ?? ""

export const env = {
  supabaseUrl: getEnvValue("EXPO_PUBLIC_SUPABASE_URL") ?? "",
  supabaseAnonKey: getEnvValue("EXPO_PUBLIC_SUPABASE_ANON_KEY") ?? "",
  backendUrl: resolveBackendUrl(configuredBackendUrl)
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

export function assertEnv(): void {
  const missing: string[] = []
  const invalid: string[] = []

  if (!env.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL")
  else {
    const issue = validateHttpUrlEnv("EXPO_PUBLIC_SUPABASE_URL", env.supabaseUrl)
    if (issue) invalid.push(issue)
  }

  if (!env.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY")
  else {
    const issue = validateTokenEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", env.supabaseAnonKey)
    if (issue) invalid.push(issue)
  }

  if (!env.backendUrl) missing.push("EXPO_PUBLIC_BACKEND_URL")
  else {
    const issue = validateHttpUrlEnv("EXPO_PUBLIC_BACKEND_URL", env.backendUrl)
    if (issue) invalid.push(issue)
  }

  const errors: string[] = []

  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(", ")}`)
  }

  if (invalid.length > 0) {
    errors.push(`Invalid environment variables:\n- ${invalid.join("\n- ")}`)
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"))
  }
}
