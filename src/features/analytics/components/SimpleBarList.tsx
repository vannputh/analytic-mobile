import { Pressable, StyleSheet, Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

export function SimpleBarList({
  title,
  rows,
  formatValue,
  onSelectRow,
  selectedLabel
}: {
  title: string
  rows: Array<{ label: string; value: number }>
  formatValue?: (value: number) => string
  onSelectRow?: (label: string) => void
  selectedLabel?: string | null
}) {
  const { palette } = useAppTheme()
  if (rows.length === 0) return null

  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <View style={styles.rows}>
        {rows.slice(0, 12).map((row) => {
          const width = Math.max(6, Math.round((row.value / max) * 100))
          const selected = selectedLabel === row.label
          return (
            <Pressable
              key={`${title}-${row.label}`}
              style={[
                styles.row,
                selected && { borderColor: palette.primary, backgroundColor: palette.surfaceMuted }
              ]}
              onPress={() => onSelectRow?.(row.label)}
              disabled={!onSelectRow}
            >
              <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={[styles.track, { backgroundColor: palette.surfaceMuted }]}>
                <View style={[styles.fill, { width: `${width}%`, backgroundColor: palette.primary }]} />
              </View>
              <Text style={[styles.value, { color: palette.textMuted }]}>
                {formatValue ? formatValue(row.value) : row.value}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  title: { fontSize: 14, fontWeight: "700" },
  rows: { gap: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "transparent", borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },
  label: { width: 90, fontSize: 12 },
  track: { flex: 1, height: 9, borderRadius: 999, overflow: "hidden" },
  fill: { height: 9, borderRadius: 999 },
  value: { width: 52, fontSize: 11, textAlign: "right" }
})
