import { Pressable, ScrollView, Text } from "react-native"
import type { ThemePalette } from "@/src/shared/theme/ThemeProvider"

interface MediaFilterStripProps {
  allLabel: string
  label: string
  options: string[]
  selectedValue: string | null
  palette: ThemePalette
  onSelect: (value: string | null) => void
}

export function MediaFilterStrip({
  allLabel,
  label,
  options,
  selectedValue,
  palette,
  onSelect
}: MediaFilterStripProps) {
  if (options.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      accessibilityLabel={label}
    >
      <FilterChip
        active={selectedValue == null}
        label={allLabel}
        palette={palette}
        onPress={() => onSelect(null)}
      />
      {options.map((option) => (
        <FilterChip
          key={`${label}-${option}`}
          active={selectedValue === option}
          label={option}
          palette={palette}
          onPress={() => onSelect(selectedValue === option ? null : option)}
        />
      ))}
    </ScrollView>
  )
}

interface FilterChipProps {
  active: boolean
  label: string
  palette: ThemePalette
  onPress: () => void
}

function FilterChip({ active, label, palette, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: active ? palette.primary : palette.border,
        backgroundColor: active ? palette.primary : palette.surface,
        opacity: pressed ? 0.7 : 1
      })}
    >
      <Text
        selectable
        style={{
          color: active ? palette.primaryText : palette.text,
          fontSize: 13,
          fontWeight: "600"
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
