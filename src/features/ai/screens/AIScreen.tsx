import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "@/src/shared/api/supabase"
import { backendFetch } from "@/src/shared/api/backend"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type {
  AIQueryResponse,
  ExecuteActionsResponse,
  MediaAction,
  ValidatedMediaAction,
  WorkspaceType
} from "@analytics/contracts"

const STATUS_OPTIONS = ["Watching", "Finished", "On Hold", "Dropped", "Plan to Watch", "Planned"]

export function AIScreen() {
  const { palette } = useAppTheme()
  const [workspace, setWorkspace] = useState<WorkspaceType>("media")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIQueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [validationOpen, setValidationOpen] = useState(false)
  const [validating, setValidating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [validatedActions, setValidatedActions] = useState<ValidatedMediaAction[]>([])
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())

  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<MediaAction["data"] | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    setResult(null)
    setValidatedActions([])
    setSelectedIndexes(new Set())

    try {
      const response = await backendFetch<AIQueryResponse>("/api/ai-query", {
        method: "POST",
        body: JSON.stringify({ query, workspace })
      })
      setResult(response)

      if (response.type === "action" && Array.isArray(response.actions)) {
        await openActionValidation(response.actions)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run query")
    } finally {
      setLoading(false)
    }
  }

  async function openActionValidation(actions: MediaAction[]) {
    setValidating(true)
    try {
      const validated = await validateActions(actions)
      setValidatedActions(validated)
      setSelectedIndexes(new Set(validated.map((item, index) => (item.validation.valid ? index : -1)).filter((index) => index >= 0)))
      setValidationOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to validate actions")
    } finally {
      setValidating(false)
    }
  }

  function toggleSelection(index: number) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function startEditAction(index: number) {
    const target = validatedActions[index]
    if (!target) return
    setEditIndex(index)
    setEditDraft(target.action.data ?? {})
  }

  function applyActionEdit() {
    if (editIndex == null || !editDraft) return
    setValidatedActions((prev) =>
      prev.map((item, idx) => {
        if (idx !== editIndex) return item
        return {
          ...item,
          action: {
            ...item.action,
            data: {
              ...item.action.data,
              ...editDraft
            }
          }
        }
      })
    )
    setEditIndex(null)
    setEditDraft(null)
  }

  async function executeActions() {
    const selected = Array.from(selectedIndexes)
      .map((index) => validatedActions[index])
      .filter((item) => item?.validation.valid)
      .map((item) => item.action)

    if (selected.length === 0) {
      setError("Select at least one valid action")
      return
    }

    setExecuting(true)
    setError(null)
    try {
      const response = await backendFetch<ExecuteActionsResponse>("/api/execute-actions", {
        method: "POST",
        body: JSON.stringify({ actions: selected })
      })

      if (!response.success && response.summary.succeeded === 0) {
        throw new Error("No actions executed")
      }

      setError(`Executed ${response.summary.succeeded}/${response.summary.total} actions`)
      setValidationOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute actions")
    } finally {
      setExecuting(false)
    }
  }

  const selectedCount = useMemo(() => selectedIndexes.size, [selectedIndexes])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>AI Assistant</Text>

      <View style={styles.modeRow}>
        <ModeButton label="Media" active={workspace === "media"} onPress={() => setWorkspace("media")} palette={palette} />
        <ModeButton label="Food" active={workspace === "food"} onPress={() => setWorkspace("food")} palette={palette} />
      </View>

      <TextInput
        style={[styles.input, themedInput(palette)]}
        value={query}
        onChangeText={setQuery}
        placeholder="Ask a question or request an action"
        placeholderTextColor={palette.textMuted}
        multiline
      />

      <Pressable style={[styles.submit, { backgroundColor: palette.primary }]} onPress={submit} disabled={loading || !query.trim()}>
        {loading ? <ActivityIndicator color={palette.primaryText} /> : <Text style={[styles.submitText, { color: palette.primaryText }]}>Run</Text>}
      </Pressable>

      {validating ? (
        <View style={styles.validatingRow}>
          <ActivityIndicator color={palette.primary} />
          <Text style={{ color: palette.textMuted }}>Validating actions...</Text>
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

      <ScrollView style={styles.results} contentContainerStyle={{ paddingBottom: 24 }}>
        {result && result.type !== "action" ? (
          <AIQueryVisualization response={result} palette={palette} />
        ) : result?.type === "action" && Array.isArray(result.actions) ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>{result.intent ?? "Action Plan"}</Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>{result.actions.length} actions generated</Text>
            <Pressable style={[styles.secondaryButton, { borderColor: palette.border }]} onPress={() => setValidationOpen(true)}>
              <Text style={{ color: palette.text, fontWeight: "700" }}>Review & Execute</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={validationOpen} animationType="slide" onRequestClose={() => setValidationOpen(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Confirm Actions</Text>
            <Pressable onPress={() => setValidationOpen(false)}>
              <Text style={{ color: palette.primary, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          <Text style={[styles.meta, { color: palette.textMuted }]}>Selected: {selectedCount}</Text>

          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {validatedActions.map((item, index) => {
              const selected = selectedIndexes.has(index)
              const canSelect = item.validation.valid
              return (
                <Pressable
                  key={`${item.action.type}-${index}`}
                  style={[
                    styles.actionRow,
                    {
                      backgroundColor: palette.surface,
                      borderColor: canSelect ? (selected ? palette.primary : palette.border) : palette.danger
                    }
                  ]}
                  onPress={() => canSelect && toggleSelection(index)}
                >
                  <View style={styles.actionHeader}>
                    <Text style={[styles.actionType, { color: palette.text }]}>{item.action.type.toUpperCase()}</Text>
                    <Text style={{ color: selected ? palette.primary : palette.textMuted }}>{selected ? "Selected" : "Not selected"}</Text>
                  </View>
                  <Text style={{ color: palette.text }}>{item.action.data?.title ?? "Untitled action"}</Text>
                  {item.matchedEntry ? (
                    <Text style={[styles.meta, { color: palette.textMuted }]}>Match: {item.matchedEntry.title}</Text>
                  ) : null}
                  {item.validation.errors.map((msg) => (
                    <Text key={`error-${msg}`} style={[styles.validationText, { color: palette.danger }]}>Error: {msg}</Text>
                  ))}
                  {item.validation.warnings.map((msg) => (
                    <Text key={`warn-${msg}`} style={[styles.validationText, { color: "#d97706" }]}>Warning: {msg}</Text>
                  ))}

                  {item.action.type === "create" ? (
                    <Pressable
                      style={[styles.secondaryButton, { borderColor: palette.border }]}
                      onPress={() => startEditAction(index)}
                    >
                      <Text style={{ color: palette.text }}>Edit</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              )
            })}
          </ScrollView>

          <Pressable
            style={[
              styles.submit,
              {
                backgroundColor: selectedCount > 0 ? palette.success : palette.surfaceMuted
              }
            ]}
            onPress={executeActions}
            disabled={executing || selectedCount === 0}
          >
            {executing ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Execute Selected</Text>}
          </Pressable>
        </SafeAreaView>
      </Modal>

      <Modal visible={editIndex != null && Boolean(editDraft)} animationType="slide" onRequestClose={() => setEditIndex(null)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Edit Action</Text>
            <Pressable onPress={() => setEditIndex(null)}>
              <Text style={{ color: palette.primary, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>

          {editDraft ? (
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              <TextInput
                style={[styles.input, themedInput(palette)]}
                value={editDraft.title ?? ""}
                onChangeText={(value) => setEditDraft((prev) => ({ ...prev, title: value }))}
                placeholder="Title"
                placeholderTextColor={palette.textMuted}
              />
              <TextInput
                style={[styles.input, themedInput(palette)]}
                value={editDraft.medium ?? ""}
                onChangeText={(value) => setEditDraft((prev) => ({ ...prev, medium: value }))}
                placeholder="Medium"
                placeholderTextColor={palette.textMuted}
              />
              <TextInput
                style={[styles.input, themedInput(palette)]}
                value={editDraft.platform ?? ""}
                onChangeText={(value) => setEditDraft((prev) => ({ ...prev, platform: value }))}
                placeholder="Platform"
                placeholderTextColor={palette.textMuted}
              />
              <TextInput
                style={[styles.input, themedInput(palette)]}
                value={editDraft.status ?? ""}
                onChangeText={(value) => setEditDraft((prev) => ({ ...prev, status: value }))}
                placeholder={`Status (${STATUS_OPTIONS.join(", ")})`}
                placeholderTextColor={palette.textMuted}
              />
              <TextInput
                style={[styles.input, themedInput(palette)]}
                value={editDraft.my_rating != null ? String(editDraft.my_rating) : ""}
                onChangeText={(value) => {
                  const parsed = Number(value)
                  setEditDraft((prev) => ({ ...prev, my_rating: Number.isFinite(parsed) ? parsed : undefined }))
                }}
                placeholder="My rating (0-10)"
                placeholderTextColor={palette.textMuted}
                keyboardType="decimal-pad"
              />

              <Pressable style={[styles.submit, { backgroundColor: palette.primary }]} onPress={applyActionEdit}>
                <Text style={[styles.submitText, { color: palette.primaryText }]}>Save Action</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function AIQueryVisualization({
  response,
  palette
}: {
  response: AIQueryResponse
  palette: ReturnType<typeof useAppTheme>["palette"]
}) {
  const rows = response.data ?? []
  const metadata = response.metadata

  if (!metadata) {
    return (
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={{ color: palette.text }}>{JSON.stringify(response, null, 2)}</Text>
      </View>
    )
  }

  if (metadata.visualizationType === "kpi" && rows.length > 0 && metadata.columns.length > 0) {
    const key = metadata.columns[0]
    return (
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.meta, { color: palette.textMuted }]}>{response.explanation}</Text>
        <Text style={[styles.kpiValue, { color: palette.text }]}>{String(rows[0][key] ?? "-")}</Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>{key}</Text>
      </View>
    )
  }

  if ((metadata.visualizationType === "bar" || metadata.visualizationType === "pie" || metadata.visualizationType === "line" || metadata.visualizationType === "area") && metadata.columns.length >= 2) {
    const labelKey = metadata.columns[0]
    const valueKey = metadata.columns[1]
    const maxValue = Math.max(
      ...rows.map((row) => (typeof row[valueKey] === "number" ? Number(row[valueKey]) : 0)),
      1
    )

    return (
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.meta, { color: palette.textMuted }]}>{response.explanation}</Text>
        {rows.slice(0, 20).map((row, index) => {
          const value = typeof row[valueKey] === "number" ? Number(row[valueKey]) : 0
          const widthPct = Math.max(4, Math.round((value / maxValue) * 100))
          return (
            <View key={`${String(row[labelKey])}-${index}`} style={styles.chartRow}>
              <Text style={[styles.chartLabel, { color: palette.text }]} numberOfLines={1}>{String(row[labelKey] ?? "-")}</Text>
              <View style={[styles.chartTrack, { backgroundColor: palette.surfaceMuted }]}>
                <View style={[styles.chartFill, { backgroundColor: palette.primary, width: `${widthPct}%` }]} />
              </View>
              <Text style={[styles.chartValue, { color: palette.textMuted }]}>{String(value)}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.meta, { color: palette.textMuted }]}>{response.explanation}</Text>
      <ScrollView horizontal>
        <View>
          <View style={styles.tableHeader}>
            {metadata.columns.map((column) => (
              <Text key={column} style={[styles.tableHeaderCell, { color: palette.text }]}>{column}</Text>
            ))}
          </View>
          {rows.slice(0, 30).map((row, idx) => (
            <View key={`row-${idx}`} style={styles.tableRow}>
              {metadata.columns.map((column) => (
                <Text key={`${column}-${idx}`} style={[styles.tableCell, { color: palette.textMuted }]}>
                  {formatCell(row[column])}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

function formatCell(value: unknown) {
  if (value == null) return "-"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function ModeButton({
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
        styles.modeButton,
        {
          backgroundColor: active ? palette.primary : palette.surface,
          borderColor: palette.border
        }
      ]}
      onPress={onPress}
    >
      <Text style={{ color: active ? palette.primaryText : palette.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  )
}

function themedInput(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    color: palette.text
  }
}

async function validateActions(actions: MediaAction[]): Promise<ValidatedMediaAction[]> {
  const { data: mediaData } = await supabase
    .from("media_entries")
    .select("id,title,status")
    .order("created_at", { ascending: false })
    .limit(500)

  const entries = (mediaData ?? []) as Array<{ id: string; title: string; status: string | null }>

  return actions.map((action) => {
    const errors: string[] = []
    const warnings: string[] = []
    const data = action.data ?? {}
    const title = data.title?.trim() ?? ""

    if (!title) errors.push("Missing title")

    const matchedEntry = entries.find((entry) => {
      const left = entry.title.toLowerCase().trim()
      const right = title.toLowerCase()
      return left === right || left.includes(right) || right.includes(left)
    })

    if ((action.type === "update" || action.type === "delete") && !matchedEntry) {
      errors.push("No matching diary entry found")
    }
    if (action.type === "create" && matchedEntry) {
      warnings.push(`Similar title already exists: ${matchedEntry.title}`)
    }
    if (data.my_rating != null && (data.my_rating < 0 || data.my_rating > 10)) {
      errors.push("my_rating must be between 0 and 10")
    }
    if (data.status && !STATUS_OPTIONS.includes(data.status)) {
      warnings.push(`Non-standard status: ${data.status}`)
    }

    return {
      action: {
        ...action,
        id: action.id ?? matchedEntry?.id
      },
      matchedEntry: matchedEntry
        ? { id: matchedEntry.id, title: matchedEntry.title, status: matchedEntry.status }
        : null,
      validation: {
        valid: errors.length === 0,
        errors,
        warnings
      }
    }
  })
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  modeRow: { flexDirection: "row", gap: 8 },
  modeButton: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 100,
    padding: 12,
    textAlignVertical: "top"
  },
  submit: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" },
  validatingRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  error: { fontSize: 12 },
  results: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  kpiValue: { fontSize: 40, fontWeight: "700", textAlign: "center" },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartLabel: { width: 110, fontSize: 12 },
  chartTrack: { flex: 1, height: 10, borderRadius: 999, overflow: "hidden" },
  chartFill: { height: 10, borderRadius: 999 },
  chartValue: { width: 48, textAlign: "right", fontSize: 11 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cbd5e1", paddingBottom: 6, marginBottom: 6 },
  tableHeaderCell: { width: 140, fontWeight: "700", fontSize: 12 },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  tableCell: { width: 140, fontSize: 12 },
  modalContainer: { flex: 1, padding: 16, gap: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  actionRow: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 5 },
  actionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionType: { fontWeight: "700" },
  validationText: { fontSize: 11 }
})
