import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/api/request-auth"
import type { AdminCountsSummary, AdminStatsResponse } from "@analytics/contracts"

function summarizeCounts(rows: Array<{ status: string; is_admin: boolean }>): AdminCountsSummary {
  const summary: AdminCountsSummary = {
    total: rows.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    admin: 0
  }

  for (const row of rows) {
    if (row.status === "pending") summary.pending += 1
    if (row.status === "approved") summary.approved += 1
    if (row.status === "rejected") summary.rejected += 1
    if (row.is_admin) summary.admin += 1
  }

  return summary
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (!auth.success) return auth.response

  const { supabase } = auth.context
  const { data, error } = await supabase.from("user_profiles").select("status,is_admin")
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const payload: AdminStatsResponse = {
    success: true,
    data: summarizeCounts((data ?? []) as Array<{ status: string; is_admin: boolean }>)
  }

  return NextResponse.json(payload)
}
