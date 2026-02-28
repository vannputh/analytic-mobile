import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  AdminUsersStatusFilter,
  UserProfileSummary
} from "@analytics/contracts"
import {
  approveAdminUser,
  fetchAdminRequests,
  fetchAdminStats,
  fetchAdminUsers,
  rejectAdminUser
} from "@/src/features/admin/api/adminApi"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

type AdminTab = "dashboard" | "requests" | "users"

const STATUS_FILTERS: AdminUsersStatusFilter[] = ["all", "approved", "pending", "rejected"]

export function AdminScreen() {
  const queryClient = useQueryClient()
  const { palette } = useAppTheme()

  const [tab, setTab] = useState<AdminTab>("dashboard")
  const [reason, setReason] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminUsersStatusFilter>("all")

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats
  })

  const requestsQuery = useQuery({
    queryKey: ["admin-requests"],
    queryFn: fetchAdminRequests
  })

  const usersQuery = useQuery({
    queryKey: ["admin-users", statusFilter, search],
    queryFn: () => fetchAdminUsers(statusFilter, search)
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => approveAdminUser({ userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: (payload: { userId: string; reason?: string }) => rejectAdminUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    }
  })

  const users = usersQuery.data?.data ?? []
  const pendingRequests = requestsQuery.data?.data ?? []
  const stats = statsQuery.data?.data

  const content = useMemo(() => {
    if (tab === "dashboard") {
      if (statsQuery.isLoading) return <ActivityIndicator color={palette.primary} />
      if (!stats) return <Text style={[styles.error, { color: palette.danger }]}>Failed to load stats</Text>

      return (
        <View style={styles.cardsGrid}>
          <StatCard label="Pending" value={stats.pending} palette={palette} />
          <StatCard label="Approved" value={stats.approved} palette={palette} />
          <StatCard label="Rejected" value={stats.rejected} palette={palette} />
          <StatCard label="Total Users" value={stats.total} palette={palette} />
          <StatCard label="Admins" value={stats.admin} palette={palette} />
        </View>
      )
    }

    if (tab === "requests") {
      if (requestsQuery.isLoading) return <ActivityIndicator color={palette.primary} />
      return (
        <View style={styles.section}>
          <TextInput
            style={[styles.input, themedInput(palette)]}
            value={reason}
            onChangeText={setReason}
            placeholder="Optional reject reason"
            placeholderTextColor={palette.textMuted}
          />
          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AdminUserRow
                item={item}
                palette={palette}
                onApprove={() => approveMutation.mutate(item.user_id)}
                onReject={() => rejectMutation.mutate({ userId: item.user_id, reason: reason.trim() || undefined })}
                showStatus={false}
              />
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: palette.textMuted }]}>No pending requests</Text>
            }
            contentContainerStyle={{ gap: 8, paddingBottom: 80 }}
          />
        </View>
      )
    }

    if (usersQuery.isLoading) return <ActivityIndicator color={palette.primary} />
    return (
      <View style={styles.section}>
        <TextInput
          style={[styles.input, themedInput(palette)]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by email or user ID"
          placeholderTextColor={palette.textMuted}
        />

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              style={[
                styles.filterPill,
                {
                  borderColor: palette.border,
                  backgroundColor: statusFilter === filter ? palette.primary : palette.surface
                }
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={{ color: statusFilter === filter ? palette.primaryText : palette.text, fontWeight: "700" }}>
                {filter.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AdminUserRow
              item={item}
              palette={palette}
              onApprove={() => approveMutation.mutate(item.user_id)}
              onReject={() => rejectMutation.mutate({ userId: item.user_id })}
              showStatus
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.textMuted }]}>No users in this filter</Text>
          }
          contentContainerStyle={{ gap: 8, paddingBottom: 80 }}
        />
      </View>
    )
  }, [
    tab,
    statsQuery.isLoading,
    stats,
    requestsQuery.isLoading,
    pendingRequests,
    usersQuery.isLoading,
    search,
    statusFilter,
    users,
    reason,
    approveMutation,
    rejectMutation,
    palette
  ])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>Admin</Text>

      <View style={styles.tabRow}>
        <TabButton label="Dashboard" active={tab === "dashboard"} onPress={() => setTab("dashboard")} palette={palette} />
        <TabButton label="Requests" active={tab === "requests"} onPress={() => setTab("requests")} palette={palette} />
        <TabButton label="Users" active={tab === "users"} onPress={() => setTab("users")} palette={palette} />
      </View>

      {content}
    </SafeAreaView>
  )
}

function TabButton({
  label,
  active,
  onPress,
  palette
}: {
  label: string
  active: boolean
  onPress: () => void
  palette: ReturnType<typeof useAppTheme>["palette"]
}) {
  return (
    <Pressable
      style={[
        styles.tabButton,
        {
          borderColor: palette.border,
          backgroundColor: active ? palette.primary : palette.surface
        }
      ]}
      onPress={onPress}
    >
      <Text style={{ color: active ? palette.primaryText : palette.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  )
}

function StatCard({
  label,
  value,
  palette
}: {
  label: string
  value: number
  palette: ReturnType<typeof useAppTheme>["palette"]
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.cardLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: palette.text }]}>{value}</Text>
    </View>
  )
}

function AdminUserRow({
  item,
  onApprove,
  onReject,
  showStatus,
  palette
}: {
  item: UserProfileSummary
  onApprove: () => void
  onReject: () => void
  showStatus: boolean
  palette: ReturnType<typeof useAppTheme>["palette"]
}) {
  return (
    <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.email, { color: palette.text }]}>{item.email}</Text>
      <Text style={[styles.meta, { color: palette.textMuted }]}>Requested {new Date(item.requested_at).toLocaleDateString()}</Text>
      {showStatus ? <Text style={[styles.meta, { color: palette.textMuted }]}>Status: {item.status}</Text> : null}
      {item.rejection_reason ? <Text style={[styles.meta, { color: palette.textMuted }]}>Reason: {item.rejection_reason}</Text> : null}
      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: palette.success }]} onPress={onApprove}>
          <Text style={styles.buttonText}>Approve</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.danger }]} onPress={onReject}>
          <Text style={styles.buttonText}>Reject</Text>
        </Pressable>
      </View>
    </View>
  )
}

function themedInput(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    color: palette.text
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12
  },
  cardLabel: { fontSize: 12, marginBottom: 6 },
  cardValue: { fontSize: 24, fontWeight: "700" },
  section: { flex: 1, gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  email: { fontWeight: "700" },
  meta: { fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 24 },
  error: { fontSize: 13 }
})
