import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import type { MediaEntry } from "@/src/shared/types/database"
import type { ThemePalette } from "@/src/shared/theme/ThemeProvider"
import { formatRatingStars, toMonthDay } from "@/src/features/media/lib/media-formatters"

interface MediaEntryRowProps {
  entry: MediaEntry
  palette: ThemePalette
  selected: boolean
  selectMode: boolean
  onPress: () => void
}

export function MediaEntryRow({
  entry,
  palette,
  selected,
  selectMode,
  onPress
}: MediaEntryRowProps) {
  const monthDay = toMonthDay(entry.finish_date ?? entry.start_date)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? palette.surfaceMuted : "transparent"
      })}
    >
      <View
        style={{
          width: 52,
          paddingVertical: 8,
          borderRadius: 16,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.surfaceMuted
        }}
      >
        <Text selectable style={{ color: palette.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 }}>
          {monthDay.month}
        </Text>
        <Text selectable style={{ color: palette.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.6 }}>
          {monthDay.day}
        </Text>
      </View>

      {entry.poster_url ? (
        <Image
          source={{ uri: entry.poster_url }}
          style={{ width: 54, height: 78, borderRadius: 14, backgroundColor: palette.surfaceMuted }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: 54,
            height: 78,
            borderRadius: 14,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.surfaceMuted
          }}
        >
          <Ionicons name="film-outline" size={20} color={palette.textMuted} />
        </View>
      )}

      <View style={{ flex: 1, gap: 6 }}>
        <Text selectable numberOfLines={1} style={{ color: palette.text, fontSize: 17, fontWeight: "600" }}>
          {entry.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          {entry.medium ? <RowTag label={entry.medium} palette={palette} /> : null}
          {entry.status ? <RowTag label={entry.status} palette={palette} tone={entry.status === "Finished" ? "success" : "default"} /> : null}
        </View>
        <Text selectable style={{ color: palette.textMuted, fontSize: 12, fontWeight: "500" }}>
          {formatRatingStars(entry.my_rating)} {entry.my_rating != null ? entry.my_rating.toFixed(1) : "-"}
        </Text>
      </View>

      {selectMode ? (
        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={24} color={selected ? palette.primary : palette.textMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
      )}
    </Pressable>
  )
}

function RowTag({
  label,
  palette,
  tone = "default"
}: {
  label: string
  palette: ThemePalette
  tone?: "default" | "success"
}) {
  const backgroundColor = tone === "success" ? "rgba(52, 199, 89, 0.12)" : palette.surfaceMuted
  const textColor = tone === "success" ? palette.success : palette.textMuted

  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        borderCurve: "continuous",
        backgroundColor
      }}
    >
      <Text selectable style={{ color: textColor, fontSize: 11, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  )
}
