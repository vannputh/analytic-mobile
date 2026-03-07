import { StyleSheet, Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface KPIGridProps {
  rows: Array<{ label: string; value: string }>
}

export function KPIGrid({ rows }: KPIGridProps) {
  const { palette } = useAppTheme()

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.label} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <Text style={[styles.label, { color: palette.textMuted }]}>{row.label}</Text>
          <Text style={[styles.value, { color: palette.text }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  card: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    fontWeight: "600"
  },
  value: {
    fontSize: 21,
    fontWeight: "800"
  }
})
