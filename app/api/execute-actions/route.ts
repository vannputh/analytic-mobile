import { NextRequest, NextResponse } from "next/server"
import { createEntry, updateEntry, deleteEntry } from "@/lib/actions"
import { MediaAction } from "@/lib/ai-action-parser"

export interface ExecuteActionsRequest {
  actions: MediaAction[]
}

export interface ActionResult {
  success: boolean
  action: MediaAction
  error?: string
  entryId?: string
}

export interface ExecuteActionsResponse {
  success: boolean
  results: ActionResult[]
  summary: {
    total: number
    succeeded: number
    failed: number
  }
}

export async function POST(request: NextRequest) {
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

    const results: ActionResult[] = []

    // Execute each action
    for (const action of body.actions) {
      try {
        if (action.type === "create") {
          if (!action.data || !action.data.title) {
            results.push({
              success: false,
              action,
              error: "Title is required for create action"
            })
            continue
          }

          const result = await createEntry(action.data as any)
          
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
        } else if (action.type === "update") {
          if (!action.id) {
            results.push({
              success: false,
              action,
              error: "Entry ID is required for update action"
            })
            continue
          }

          if (!action.data) {
            results.push({
              success: false,
              action,
              error: "Update data is required"
            })
            continue
          }

          const result = await updateEntry(action.id, action.data as any)
          
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
        } else if (action.type === "delete") {
          if (!action.id) {
            results.push({
              success: false,
              action,
              error: "Entry ID is required for delete action"
            })
            continue
          }

          const result = await deleteEntry(action.id)
          
          if (result.success) {
            results.push({
              success: true,
              action,
              entryId: action.id
            })
          } else {
            results.push({
              success: false,
              action,
              error: result.error
            })
          }
        } else {
          results.push({
            success: false,
            action,
            error: `Unknown action type: ${action.type}`
          })
        }
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
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }

    return NextResponse.json({
      success: summary.failed === 0,
      results,
      summary
    })
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
