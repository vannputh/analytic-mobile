import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/api/request-auth"
import type {
  AdminCountsSummary,
  AdminUsersResponse,
  AdminUsersStatusFilter,
  UserProfileSummary
} from "@analytics/contracts"

const USER_FIELDS =
  "id,user_id,email,status,is_admin,requested_at,approved_at,approved_by,rejection_reason,created_at,updated_at"

function isStatusFilter(value: string | null): value is AdminUsersStatusFilter {
  return value === "all" || value === "pending" || value === "approved" || value === "rejected"
}

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
  const searchParams = request.nextUrl.searchParams

  const statusParam = searchParams.get("status")
  const status: AdminUsersStatusFilter = isStatusFilter(statusParam) ? statusParam : "all"
  const query = searchParams.get("q")?.trim() ?? ""

  const countsQuery = await supabase.from("user_profiles").select("status,is_admin")
  if (countsQuery.error) {
    return NextResponse.json({ success: false, error: countsQuery.error.message }, { status: 500 })
  }

  let listQuery = supabase.from("user_profiles").select(USER_FIELDS)
  if (status !== "all") {
    listQuery = listQuery.eq("status", status)
  }
  if (query) {
    const escaped = query.replace(/,/g, "\\,")
    listQuery = listQuery.or(`email.ilike.%${escaped}%,user_id.ilike.%${escaped}%`)
  }

  const { data, error } = await listQuery.order("created_at", { ascending: false })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const payload: AdminUsersResponse = {
    success: true,
    data: (data ?? []) as UserProfileSummary[],
    status,
    query,
    counts: summarizeCounts((countsQuery.data ?? []) as Array<{ status: string; is_admin: boolean }>)
  }

  return NextResponse.json(payload)
}
