import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

export function DateRangeRow({
  from,
  to,
  onFromChange,
  onToChange
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) {
  const { palette } = useAppTheme()
  return (
    <View style={styles.dateRow}>
      <TextInput
        style={[styles.dateInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        value={from}
        onChangeText={onFromChange}
        placeholder="From YYYY-MM-DD"
        placeholderTextColor={palette.textMuted}
      />
      <TextInput
        style={[styles.dateInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        value={to}
        onChangeText={onToChange}
        placeholder="To YYYY-MM-DD"
        placeholderTextColor={palette.textMuted}
      />
    </View>
  )
}

export function MultiSelectChips({
  label,
  options,
  selected,
  onToggle
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const { palette } = useAppTheme()
  if (options.length === 0) return null

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <Pressable
              key={`${label}-${option}`}
              style={[
                styles.chip,
                {
                  borderColor: palette.border,
                  backgroundColor: active ? palette.primary : palette.surface
                }
              ]}
              onPress={() => onToggle(option)}
            >
              <Text style={{ color: active ? palette.primaryText : palette.text, fontSize: 12 }}>{option}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: "row", gap: 8 },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12
  },
  block: { gap: 6 },
  label: { fontSize: 11, fontWeight: "700" },
  chipsRow: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  }
})
