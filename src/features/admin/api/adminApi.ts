import { backendFetch } from "@/src/shared/api/backend"
import type {
  AdminApproveRequest,
  AdminMutationResponse,
  AdminRejectRequest,
  AdminRequestsResponse,
  AdminStatsResponse,
  AdminUsersResponse,
  AdminUsersStatusFilter
} from "@analytics/contracts"

export function fetchAdminRequests() {
  return backendFetch<AdminRequestsResponse>("/api/admin/requests")
}

export function fetchAdminStats() {
  return backendFetch<AdminStatsResponse>("/api/admin/stats")
}

export function fetchAdminUsers(status: AdminUsersStatusFilter, query: string) {
  const params = new URLSearchParams()
  params.set("status", status)
  if (query.trim()) params.set("q", query.trim())
  return backendFetch<AdminUsersResponse>(`/api/admin/users?${params.toString()}`)
}

export function approveAdminUser(payload: AdminApproveRequest) {
  return backendFetch<AdminMutationResponse>("/api/admin/approve", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function rejectAdminUser(payload: AdminRejectRequest) {
  return backendFetch<AdminMutationResponse>("/api/admin/reject", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}
