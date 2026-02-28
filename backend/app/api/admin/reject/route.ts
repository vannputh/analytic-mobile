import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/api/request-auth"
import type { AdminRejectRequest, AdminMutationResponse } from "@analytics/contracts"

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.success) return auth.response

  const { supabase } = auth.context

  let body: AdminRejectRequest
  try {
    body = (await request.json()) as AdminRejectRequest
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.userId) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      status: "rejected",
      rejection_reason: body.reason ?? null
    })
    .eq("user_id", body.userId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const payload: AdminMutationResponse = { success: true }
  return NextResponse.json(payload)
}
