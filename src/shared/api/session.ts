import type { Session } from "@supabase/supabase-js"
import { getSupabaseInitializationError, supabase } from "@/src/shared/api/supabase"

export type SessionSnapshotStatus = "resolved" | "timeout" | "error"

interface SessionSnapshotResult {
  session: Session | null
  status: SessionSnapshotStatus
}

const DEFAULT_SESSION_TIMEOUT_MS = 6000

export async function getSessionSnapshot(timeoutMs = DEFAULT_SESSION_TIMEOUT_MS): Promise<SessionSnapshotResult> {
  if (getSupabaseInitializationError()) {
    return {
      session: null,
      status: "error"
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    const lookup = supabase.auth
      .getSession()
      .then(({ data }) => ({
        session: data.session ?? null,
        status: "resolved" as const
      }))
      .catch(() => ({
        session: null,
        status: "error" as const
      }))

    const timeout = new Promise<SessionSnapshotResult>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve({
          session: null,
          status: "timeout"
        })
      }, timeoutMs)
    })

    return await Promise.race([lookup, timeout])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}
