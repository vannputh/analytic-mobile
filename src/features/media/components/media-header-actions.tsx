import type { ColorValue } from "react-native"
import { Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { ThemePalette } from "@/src/shared/theme/ThemeProvider"

interface MediaHeaderActionsProps {
  palette: ThemePalette
  onOpenAssistant: () => void
  onOpenAdd: () => void
  onOpenMore: () => void
}

export function MediaHeaderActions({
  palette,
  onOpenAssistant,
  onOpenAdd,
  onOpenMore
}: MediaHeaderActionsProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <HeaderIconButton icon="sparkles-outline" color={palette.text} onPress={onOpenAssistant} />
      <HeaderIconButton icon="add" color={palette.text} onPress={onOpenAdd} />
      <HeaderIconButton icon="ellipsis-horizontal" color={palette.text} onPress={onOpenMore} />
    </View>
  )
}

interface HeaderIconButtonProps {
  color: ColorValue
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}

function HeaderIconButton({ color, icon, onPress }: HeaderIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.55 : 1
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  )
}
