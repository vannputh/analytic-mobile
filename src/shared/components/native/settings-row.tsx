import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface SettingsRowProps {
  title: string
  subtitle?: string
  value?: string
  destructive?: boolean
  accessory?: ReactNode
  onPress?: () => void
}

export function SettingsRow({
  title,
  subtitle,
  value,
  destructive = false,
  accessory,
  onPress
}: SettingsRowProps) {
  const { palette } = useAppTheme()
  const color = destructive ? palette.danger : palette.text

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: pressed ? palette.surfaceMuted : "transparent"
      })}
    >
      <View style={{ flex: 1, gap: subtitle ? 2 : 0 }}>
        <Text selectable style={{ color, fontSize: 17, fontWeight: "500" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={{ color: palette.textMuted, fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ?? (
        <Text selectable style={{ color: value ? palette.textMuted : palette.border, fontSize: 15 }}>
          {value ?? "›"}
        </Text>
      )}
    </Pressable>
  )
}
