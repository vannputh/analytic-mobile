import { useEffect } from "react"
import { ActionSheetIOS, Modal, Pressable, Text, View } from "react-native"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { SettingsRow } from "@/src/shared/components/native/settings-row"
import type { SortKey } from "@/src/features/media/lib/media-formatters"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface MediaOverflowSheetProps {
  visible: boolean
  selectMode: boolean
  sortDescending: boolean
  sortKey: SortKey
  onClose: () => void
  onPickRandomPlanned: () => void
  onBatchFetchMetadata: () => void
  onOpenImport: () => void
  onToggleSelectMode: () => void
  onSetSortKey: (key: SortKey) => void
  onToggleSortDirection: () => void
}

export function MediaOverflowSheet({
  visible,
  selectMode,
  sortDescending,
  sortKey,
  onClose,
  onPickRandomPlanned,
  onBatchFetchMetadata,
  onOpenImport,
  onToggleSelectMode,
  onSetSortKey,
  onToggleSortDirection
}: MediaOverflowSheetProps) {
  const { palette } = useAppTheme()
  const isIos = process.env.EXPO_OS === "ios"

  useEffect(() => {
    if (!visible || !isIos) return

    const sortTitle = (() => {
      if (sortKey === "rating") return "Sort by rating (current)"
      if (sortKey === "finish_date") return "Sort by finish date (current)"
      return "Sort by title (current)"
    })()

    const options = [
      sortKey === "title" ? sortTitle : "Sort by title",
      sortKey === "rating" ? sortTitle : "Sort by rating",
      sortKey === "finish_date" ? sortTitle : "Sort by finish date",
      sortDescending ? "Descending order" : "Ascending order",
      "Watch This",
      "Batch Metadata",
      "Import CSV / TSV / TXT",
      selectMode ? "Leave Select Mode" : "Enter Select Mode",
      "Cancel"
    ]

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Media Actions",
        message: "Choose an action for the current list.",
        options,
        cancelButtonIndex: options.length - 1
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          case 0:
            onSetSortKey("title")
            break
          case 1:
            onSetSortKey("rating")
            break
          case 2:
            onSetSortKey("finish_date")
            break
          case 3:
            onToggleSortDirection()
            break
          case 4:
            onPickRandomPlanned()
            break
          case 5:
            onBatchFetchMetadata()
            break
          case 6:
            onOpenImport()
            break
          case 7:
            onToggleSelectMode()
            break
          default:
            onClose()
            break
        }
      }
    )
  }, [
    isIos,
    onBatchFetchMetadata,
    onClose,
    onOpenImport,
    onPickRandomPlanned,
    onSetSortKey,
    onToggleSelectMode,
    onToggleSortDirection,
    selectMode,
    sortDescending,
    sortKey,
    visible
  ])

  if (isIos) {
    return null
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: palette.overlay,
          padding: 16
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            gap: 14,
            borderRadius: 28,
            borderCurve: "continuous",
            backgroundColor: palette.background,
            padding: 16,
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)"
          }}
        >
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: palette.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>
              Media Actions
            </Text>
            <Text selectable style={{ color: palette.textMuted, fontSize: 14 }}>
              Utilities now live off the main list instead of inline above your entries.
            </Text>
          </View>

          <GroupedSection title="Organize">
            <SettingsRow title="Sort by title" value={sortKey === "title" ? "On" : undefined} onPress={() => onSetSortKey("title")} />
            <SettingsRow title="Sort by rating" value={sortKey === "rating" ? "On" : undefined} onPress={() => onSetSortKey("rating")} />
            <SettingsRow title="Sort by finish date" value={sortKey === "finish_date" ? "On" : undefined} onPress={() => onSetSortKey("finish_date")} />
            <SettingsRow
              title={sortDescending ? "Descending order" : "Ascending order"}
              subtitle="Toggle the watched list and shelf ordering"
              onPress={onToggleSortDirection}
            />
          </GroupedSection>

          <GroupedSection title="Tools">
            <SettingsRow title="Watch This" subtitle="Pick a random item from your planned list" onPress={onPickRandomPlanned} />
            <SettingsRow title="Batch Metadata" subtitle="Refresh missing metadata across visible items" onPress={onBatchFetchMetadata} />
            <SettingsRow title="Import CSV / TSV / TXT" subtitle="Open the import workspace in a sheet" onPress={onOpenImport} />
            <SettingsRow
              title={selectMode ? "Leave Select Mode" : "Enter Select Mode"}
              subtitle="Batch edit, finish, fetch, or delete selected entries"
              onPress={onToggleSelectMode}
            />
          </GroupedSection>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 15,
              borderRadius: 18,
              borderCurve: "continuous",
              alignItems: "center",
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              opacity: pressed ? 0.75 : 1
            })}
          >
            <Text selectable style={{ color: palette.text, fontSize: 17, fontWeight: "600" }}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
