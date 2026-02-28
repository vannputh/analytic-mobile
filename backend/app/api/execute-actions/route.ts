import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/api/request-auth"
import { createMediaEntry, updateMediaEntry, deleteMediaEntry, findMediaEntryByTitle } from "@/lib/services/media-repository"
import type { ExecuteActionResult, ExecuteActionsRequest, ExecuteActionsResponse, MediaAction } from "@analytics/contracts"

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.success) return auth.response

  const { supabase, user } = auth.context

  try {
    const body = (await request.json()) as ExecuteActionsRequest

    if (!body.actions || !Array.isArray(body.actions)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid actions field" },
        { status: 400 }
      )
    }

    if (body.actions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No actions provided" },
        { status: 400 }
      )
    }

    const results: ExecuteActionResult[] = []

    for (const action of body.actions) {
      try {
        if (action.type === "create") {
          const result = await createMediaEntry(supabase, user.id, action.data ?? {})

          if (result.success) {
            results.push({
              success: true,
              action,
              entryId: result.data.id
            })
          } else {
            results.push({
              success: false,
              action,
              error: result.error
            })
          }
          continue
        }

        if (action.type === "update") {
          let targetId = action.id

          if (!targetId && action.data?.title) {
            const matched = await findMediaEntryByTitle(supabase, user.id, action.data.title)
            targetId = matched?.id
          }

          if (!targetId) {
            results.push({
              success: false,
              action,
              error: "Entry ID or title match is required for update action"
            })
            continue
          }

          const result = await updateMediaEntry(supabase, user.id, targetId, action.data ?? {})

          if (result.success) {
            results.push({
              success: true,
              action,
              entryId: result.data.id
            })
          } else {
            results.push({
              success: false,
              action,
              error: result.error
            })
          }
          continue
        }

        if (action.type === "delete") {
          let targetId = action.id

          if (!targetId && action.data?.title) {
            const matched = await findMediaEntryByTitle(supabase, user.id, action.data.title)
            targetId = matched?.id
          }

          if (!targetId) {
            results.push({
              success: false,
              action,
              error: "Entry ID or title match is required for delete action"
            })
            continue
          }

          const result = await deleteMediaEntry(supabase, user.id, targetId)

          if (result.success) {
            results.push({
              success: true,
              action,
              entryId: targetId
            })
          } else {
            results.push({
              success: false,
              action,
              error: result.error
            })
          }
          continue
        }

        results.push({
          success: false,
          action,
          error: `Unknown action type: ${action.type}`
        })
      } catch (error) {
        results.push({
          success: false,
          action,
          error: error instanceof Error ? error.message : "Unknown error occurred"
        })
      }
    }

    const summary = {
      total: results.length,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length
    }

    const payload: ExecuteActionsResponse = {
      success: summary.failed === 0,
      results,
      summary
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Execute actions error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}
