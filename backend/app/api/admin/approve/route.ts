import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/api/request-auth"
import type { AdminApproveRequest, AdminMutationResponse } from "@analytics/contracts"

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.success) return auth.response

  const { supabase, user } = auth.context

  let body: AdminApproveRequest
  try {
    body = (await request.json()) as AdminApproveRequest
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.userId) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null
    })
    .eq("user_id", body.userId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const payload: AdminMutationResponse = { success: true }
  return NextResponse.json(payload)
}
