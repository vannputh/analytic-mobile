import * as Haptics from "expo-haptics"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

export interface SegmentedSwitchOption<T extends string> {
  value: T
  label: string
}

interface SegmentedSwitchProps<T extends string> {
  value: T
  options: SegmentedSwitchOption<T>[]
  onChange: (next: T) => void
}

export function SegmentedSwitch<T extends string>({ value, options, onChange }: SegmentedSwitchProps<T>) {
  const { palette } = useAppTheme()

  return (
    <View style={[styles.root, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            style={[
              styles.button,
              {
                backgroundColor: active ? palette.surface : "transparent",
                borderColor: active ? palette.border : "transparent"
              }
            ]}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined)
              onChange(option.value)
            }}
          >
            <Text style={[styles.label, { color: active ? palette.text : palette.textMuted }]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    flexDirection: "row",
    gap: 4
  },
  button: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    fontSize: 13,
    fontWeight: "600"
  }
})
