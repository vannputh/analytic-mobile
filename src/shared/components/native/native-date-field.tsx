import DateTimePicker from "@react-native-community/datetimepicker"
import { Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface NativeDateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseDate(value: string): Date {
  if (!value) return new Date()
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function NativeDateField({ label, value, onChange }: NativeDateFieldProps) {
  const { palette } = useAppTheme()

  return (
    <View
      style={{
        minHeight: 60,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 14,
        borderCurve: "continuous",
        paddingHorizontal: 12,
        paddingVertical: 8,
        justifyContent: "center",
        backgroundColor: palette.surface
      }}
    >
      <Text selectable style={{ color: palette.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
        {label}
      </Text>
      <DateTimePicker
        mode="date"
        value={parseDate(value)}
        display={process.env.EXPO_OS === "ios" ? "compact" : "default"}
        accentColor={palette.primary as string}
        onChange={(_event, nextValue) => {
          if (!nextValue) return
          onChange(toIsoDate(nextValue))
        }}
      />
    </View>
  )
}
