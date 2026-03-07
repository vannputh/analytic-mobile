import { Pressable, Text, View } from "react-native"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface MediaSelectionToolbarProps {
  selectedCount: number
  onDone: () => void
  onBatchEdit: () => void
  onBatchFetch: () => void
  onBatchFinish: () => void
  onBatchDelete: () => void
}

export function MediaSelectionToolbar({
  selectedCount,
  onDone,
  onBatchEdit,
  onBatchFetch,
  onBatchFinish,
  onBatchDelete
}: MediaSelectionToolbarProps) {
  const { palette, resolvedTheme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const disabled = selectedCount === 0

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 12)
      }}
    >
      <BlurView
        tint={resolvedTheme}
        intensity={60}
        style={{
          borderRadius: 28,
          borderCurve: "continuous",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: palette.border
        }}
      >
        <View
          style={{
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: "rgba(255,255,255,0.4)"
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text selectable style={{ color: palette.text, fontSize: 15, fontWeight: "700" }}>
              {selectedCount} selected
            </Text>
            <Pressable onPress={onDone}>
              <Text selectable style={{ color: palette.primary, fontSize: 15, fontWeight: "700" }}>
                Done
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ToolbarAction label="Batch Edit" disabled={disabled} palette={palette} onPress={onBatchEdit} />
            <ToolbarAction label="Batch Fetch" disabled={disabled} palette={palette} onPress={onBatchFetch} />
            <ToolbarAction label="Finish" disabled={disabled} palette={palette} onPress={onBatchFinish} />
            <ToolbarAction label="Delete" disabled={disabled} destructive palette={palette} onPress={onBatchDelete} />
          </View>
        </View>
      </BlurView>
    </View>
  )
}

function ToolbarAction({
  label,
  disabled,
  destructive = false,
  palette,
  onPress
}: {
  label: string
  disabled: boolean
  destructive?: boolean
  palette: ReturnType<typeof useAppTheme>["palette"]
  onPress: () => void
}) {
  const color = destructive ? palette.danger : palette.text
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderCurve: "continuous",
        backgroundColor: palette.surface,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1
      })}
    >
      <Text selectable style={{ color, fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  )
}
