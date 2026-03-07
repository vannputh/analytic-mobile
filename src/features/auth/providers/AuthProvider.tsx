import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import type { CheckUserResponse } from "@analytics/contracts"
import { getSupabaseInitializationError, supabase } from "@/src/shared/api/supabase"
import { getSessionSnapshot } from "@/src/shared/api/session"
import { backendFetch } from "@/src/shared/api/backend"

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  requestOtp: (email: string, signup: boolean) => Promise<void>
  verifyOtp: (email: string, token: string, signup: boolean) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string") return error
  return "Unexpected authentication error"
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function getRetryHint(loweredMessage: string): string {
  const secondsMatch = loweredMessage.match(/(\d+)\s*seconds?/)
  if (secondsMatch?.[1]) return ` Try again in about ${secondsMatch[1]} seconds.`

  const minutesMatch = loweredMessage.match(/(\d+)\s*minutes?/)
  if (minutesMatch?.[1]) return ` Try again in about ${minutesMatch[1]} minutes.`

  return " Please wait a minute and try again."
}

function mapAuthError(error: unknown, phase: "requestOtp" | "verifyOtp"): Error {
  const message = getErrorMessage(error).trim()
  const lowered = message.toLowerCase()

  if (!message) {
    return new Error(phase === "requestOtp" ? "Failed to send verification code." : "Failed to verify the code.")
  }

  if (message.includes("Cannot reach API routes at")) {
    return new Error(message)
  }

  if (lowered.includes("server configuration error") || lowered.includes("missing environment variables")) {
    return new Error(
      "Auth API is not configured. Add EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then restart Expo."
    )
  }

  if (lowered.includes("network request failed") || lowered.includes("failed to fetch")) {
    return new Error(
      phase === "requestOtp"
        ? "Could not reach the authentication service. Check your network and Supabase configuration."
        : "Could not verify the code because the authentication service is unreachable."
    )
  }

  if (lowered.includes("rate limit") || lowered.includes("too many requests") || lowered.includes("security purposes")) {
    return new Error(
      phase === "requestOtp"
        ? `Too many verification code requests.${getRetryHint(lowered)}`
        : `Too many verification attempts.${getRetryHint(lowered)}`
    )
  }

  if (lowered.includes("invalid api key") || lowered.includes("invalid url") || lowered.includes("supabase url")) {
    return new Error("Authentication is misconfigured. Verify EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.")
  }

  return new Error(message)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializationError = getSupabaseInitializationError()
    if (initializationError) {
      setLoading(false)
      return
    }

    let isMounted = true

    void getSessionSnapshot().then(({ session: nextSession, status }) => {
      if (!isMounted) return

      if (status !== "resolved" && typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(`[auth] getSessionSnapshot returned ${status} during app bootstrap`)
      }

      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function requestOtp(email: string, signup: boolean): Promise<void> {
    try {
      const initializationError = getSupabaseInitializationError()
      if (initializationError) throw initializationError

      const normalizedEmail = normalizeEmail(email)
      if (!normalizedEmail) {
        throw new Error("Email is required")
      }

      const existing = await backendFetch<CheckUserResponse>("/api/auth/check-user", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
        authenticated: false
      })

      if (signup) {
        if (existing.exists) {
          throw new Error(existing.approved ? "Email already registered" : "Request already pending")
        }
      } else {
        if (!existing.exists) {
          throw new Error("Email is not registered")
        }

        if (!existing.approved) {
          if (existing.status === "pending") {
            throw new Error("Account is pending approval")
          }
          if (existing.status === "rejected") {
            throw new Error("Access request was rejected")
          }
        }
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: signup
        }
      })

      if (error) throw error
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.error("[auth] requestOtp failed", { email: normalizeEmail(email), signup, error })
      }
      throw mapAuthError(error, "requestOtp")
    }
  }

  async function verifyOtp(email: string, token: string, signup: boolean): Promise<void> {
    try {
      const initializationError = getSupabaseInitializationError()
      if (initializationError) throw initializationError

      const normalizedEmail = normalizeEmail(email)
      if (!normalizedEmail) {
        throw new Error("Email is required")
      }

      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token,
        type: "email"
      })

      if (error) throw error

      if (signup) {
        const { data } = await supabase.auth.getUser()
        const authUser = data.user
        if (!authUser?.email) {
          throw new Error("Authentication completed but no user found")
        }

        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            user_id: authUser.id,
            email: authUser.email,
            status: "pending",
            is_admin: false
          })

        if (profileError) throw profileError

        await supabase.auth.signOut()
        throw new Error("Request submitted. Wait for approval before logging in.")
      }

      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        throw new Error("Failed to load current user")
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("status")
        .eq("user_id", data.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error("Unauthorized user")
      }

      if (profile.status !== "approved") {
        await supabase.auth.signOut()
        throw new Error(profile.status === "pending" ? "Account pending approval" : "Account rejected")
      }
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.error("[auth] verifyOtp failed", { email: normalizeEmail(email), signup, error })
      }
      throw mapAuthError(error, "verifyOtp")
    }
  }

  async function signOut(): Promise<void> {
    const initializationError = getSupabaseInitializationError()
    if (initializationError) throw initializationError

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        requestOtp,
        verifyOtp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
