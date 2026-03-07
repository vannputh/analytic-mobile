import { Pressable, ScrollView, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import type { MediaEntry } from "@/src/shared/types/database"
import type { ThemePalette } from "@/src/shared/theme/ThemeProvider"
import { formatRelativeDate, formatShortDate, progressPercent } from "@/src/features/media/lib/media-formatters"

interface MediaWatchingShelfProps {
  entries: MediaEntry[]
  palette: ThemePalette
  onOpenEntry: (entry: MediaEntry) => void
  onAddEpisode: (entry: MediaEntry) => void
}

export function MediaWatchingShelf({
  entries,
  palette,
  onOpenEntry,
  onAddEpisode
}: MediaWatchingShelfProps) {
  if (entries.length === 0) return null

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text selectable style={{ color: palette.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>
          Currently Watching
        </Text>
        <Text selectable style={{ color: palette.textMuted, fontSize: 15, fontWeight: "600" }}>
          {entries.length}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 16 }}>
        {entries.map((entry) => {
          const progress = progressPercent(entry)
          return (
            <View
              key={entry.id}
              style={{
                width: 274,
                borderRadius: 26,
                borderCurve: "continuous",
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
                overflow: "hidden",
                boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)"
              }}
            >
              <Pressable
                onPress={() => onOpenEntry(entry)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1
                })}
              >
                {entry.poster_url ? (
                  <Image source={{ uri: entry.poster_url }} style={{ width: "100%", height: 176 }} contentFit="cover" />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 176,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: palette.surfaceMuted
                    }}
                  >
                    <Ionicons name="film-outline" size={24} color={palette.textMuted} />
                  </View>
                )}

                <View style={{ padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {entry.medium ? <MetaCapsule label={entry.medium} palette={palette} /> : null}
                    {entry.season ? <MetaCapsule label={entry.season} palette={palette} /> : null}
                    {entry.episodes ? (
                      <MetaCapsule label={`${entry.episodes_watched ?? 0}/${entry.episodes} eps`} palette={palette} />
                    ) : null}
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text selectable numberOfLines={2} style={{ color: palette.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.5 }}>
                      {entry.title}
                    </Text>
                    <Text selectable style={{ color: palette.textMuted, fontSize: 13, fontWeight: "500" }}>
                      Last watched {formatRelativeDate(entry.last_watched_at ?? entry.updated_at)}
                    </Text>
                  </View>

                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text selectable style={{ color: palette.textMuted, fontSize: 12, fontWeight: "600", letterSpacing: 0.2 }}>
                        Progress
                      </Text>
                      <Text selectable style={{ color: palette.text, fontSize: 12, fontWeight: "700" }}>
                        {progress}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 7,
                        borderRadius: 999,
                        overflow: "hidden",
                        backgroundColor: palette.surfaceMuted
                      }}
                    >
                      <View
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          borderRadius: 999,
                          backgroundColor: palette.primary
                        }}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>

              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text selectable style={{ color: palette.textMuted, fontSize: 13, fontWeight: "500" }}>
                    Started {formatShortDate(entry.start_date ?? entry.updated_at)}
                  </Text>
                  <Pressable
                    onPress={() => onAddEpisode(entry)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderCurve: "continuous",
                      backgroundColor: palette.primary,
                      opacity: pressed ? 0.75 : 1
                    })}
                  >
                    <Text selectable style={{ color: palette.primaryText, fontSize: 13, fontWeight: "700" }}>
                      + Episode
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function MetaCapsule({ label, palette }: { label: string; palette: ThemePalette }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderCurve: "continuous",
        backgroundColor: palette.surfaceMuted
      }}
    >
      <Text selectable style={{ color: palette.text, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  )
}
