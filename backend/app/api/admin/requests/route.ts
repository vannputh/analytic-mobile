import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/api/request-auth"
import type { AdminRequestsResponse } from "@analytics/contracts"

export async function GET(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.success) return auth.response

  const { supabase } = auth.context

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id,user_id,email,status,is_admin,requested_at,approved_at,rejection_reason")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const payload: AdminRequestsResponse = {
    success: true,
    data: (data ?? []) as AdminRequestsResponse["data"]
  }

  return NextResponse.json(payload)
}
