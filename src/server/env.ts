function normalize(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalize((process.env as Record<string, string | undefined>)[key])
    if (value) return value
  }
  return undefined
}

export function getServerSupabaseUrl(): string | undefined {
  return getEnvValue("EXPO_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
}

export function getServerSupabaseAnonKey(): string | undefined {
  return getEnvValue("EXPO_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return getEnvValue("SUPABASE_SERVICE_ROLE_KEY")
}
