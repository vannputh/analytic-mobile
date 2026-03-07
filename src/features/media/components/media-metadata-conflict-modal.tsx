import { Modal, Pressable, ScrollView, Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type {
  MediaMetadataConflictField,
  PendingMediaMetadataSelection
} from "@/src/features/media/lib/media-editor"

interface MediaMetadataConflictModalProps {
  pendingSelection: PendingMediaMetadataSelection | null
  onToggleField: (field: MediaMetadataConflictField) => void
  onApply: () => void
  onSkip: () => void
}

export function MediaMetadataConflictModal({
  pendingSelection,
  onToggleField,
  onApply,
  onSkip
}: MediaMetadataConflictModalProps) {
  const { palette } = useAppTheme()

  return (
    <Modal visible={Boolean(pendingSelection)} transparent animationType="fade" onRequestClose={onSkip}>
      <View
        style={{
          flex: 1,
          backgroundColor: palette.overlay,
          justifyContent: "center",
          padding: 16
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 24,
            borderCurve: "continuous",
            backgroundColor: palette.surface,
            padding: 18,
            gap: 12
          }}
        >
          <Text selectable style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}>
            Metadata Override
          </Text>
          <Text selectable style={{ color: palette.textMuted, fontSize: 14, lineHeight: 20 }}>
            Select the conflicting fields you want to replace in the current draft.
          </Text>

          <ScrollView contentContainerStyle={{ gap: 8, maxHeight: 280 }}>
            {pendingSelection?.conflicts.map((conflict) => {
              const selected = pendingSelection.selections[conflict.field]
              return (
                <Pressable
                  key={conflict.field}
                  onPress={() => onToggleField(conflict.field)}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? palette.primary : palette.border,
                    borderRadius: 18,
                    borderCurve: "continuous",
                    backgroundColor: selected ? palette.surfaceMuted : palette.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 4
                  }}
                >
                  <Text selectable style={{ color: palette.text, fontSize: 15, fontWeight: "700" }}>
                    {conflict.label}
                  </Text>
                  <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
                    Current: {conflict.current}
                  </Text>
                  <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
                    Incoming: {conflict.incoming}
                  </Text>
                  <Text selectable style={{ color: selected ? palette.primary : palette.textMuted, fontSize: 12, fontWeight: "700" }}>
                    {selected ? "Will override" : "Keep current"}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <ModalActionButton label="Skip" palette={palette} onPress={onSkip} />
            <ModalActionButton filled label="Apply Selected" palette={palette} onPress={onApply} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function ModalActionButton({
  label,
  palette,
  onPress,
  filled = false
}: {
  label: string
  palette: ReturnType<typeof useAppTheme>["palette"]
  onPress: () => void
  filled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 48,
        borderWidth: 1,
        borderColor: filled ? palette.primary : palette.border,
        borderRadius: 18,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? palette.primary : palette.surface
      }}
    >
      <Text selectable style={{ color: filled ? palette.primaryText : palette.text, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  )
}
