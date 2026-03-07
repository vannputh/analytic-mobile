import type { ComponentProps, ReactNode } from "react"
import { useEffect, useState } from "react"
import type { ColorValue } from "react-native"
import { ActivityIndicator, InputAccessoryView, Keyboard, PanResponder, Pressable, Text, TextInput, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { BlurView } from "expo-blur"
import { Image } from "expo-image"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { NativeDateField } from "@/src/shared/components/native/native-date-field"
import { NativeSegmentedControl } from "@/src/shared/components/native/native-segmented-control"
import { ScreenScrollView } from "@/src/shared/components/native/screen-scroll-view"
import { backendFetch } from "@/src/shared/api/backend"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { MediaStatusHistory } from "@/src/shared/types/database"
import {
  MEDIA_EDITOR_TABS,
  MEDIA_STATUS_OPTIONS,
  deriveTimeTakenLabel,
  formatEditorDateTime,
  getSuggestedEpisodeNumber,
  toEpisodeDateInputValue,
  toNumberOrNull,
  type MediaEditorDraft,
  type MediaEditorTab
} from "@/src/features/media/lib/media-editor"
import { formatRatingStars, formatRelativeDate } from "@/src/features/media/lib/media-formatters"
import type { MetadataSearchResponse } from "@analytics/contracts"

interface MediaEditorContentProps {
  draft: MediaEditorDraft
  tab: MediaEditorTab
  message: string | null
  messageTone?: "default" | "danger"
  saving: boolean
  uploadingPoster: boolean
  fetchingMetadata: boolean
  historyLoading: boolean
  isPersisted: boolean
  statusHistory: MediaStatusHistory[]
  showDelete?: boolean
  saveLabel?: string
  onTabChange: (tab: MediaEditorTab) => void
  onDraftChange: (patch: Partial<MediaEditorDraft>) => void
  onSave: () => void
  onDelete?: () => void
  onUploadPoster: () => void
  onFetchMetadata: (paramsOverride?: { title?: string; imdb_id?: string }) => void
  onAddEpisode: (episode: number) => void
  onFinishedToday: () => void
  onUpdateEpisodeDate: (index: number, watchedAt: string) => void
  onDeleteEpisode: (index: number) => void
}

export function MediaEditorContent({
  draft,
  tab,
  message,
  messageTone = "default",
  saving,
  uploadingPoster,
  fetchingMetadata,
  historyLoading,
  isPersisted,
  statusHistory,
  showDelete = false,
  saveLabel = "Save Changes",
  onTabChange,
  onDraftChange,
  onSave,
  onDelete,
  onUploadPoster,
  onFetchMetadata,
  onAddEpisode,
  onFinishedToday,
  onUpdateEpisodeDate,
  onDeleteEpisode
}: MediaEditorContentProps) {
  const { palette, resolvedTheme } = useAppTheme()
  const [metadataSearchLoading, setMetadataSearchLoading] = useState(false)
  const [metadataSearchResults, setMetadataSearchResults] = useState<MetadataSearchResponse["results"]>([])
  const [episodeDraft, setEpisodeDraft] = useState(String(Math.max(getSuggestedEpisodeNumber(draft), 1)))
  const [episodeDateDrafts, setEpisodeDateDrafts] = useState<Record<number, string>>({})
  const keyboardAccessoryId = process.env.EXPO_OS === "ios" ? "media-editor-keyboard-accessory" : undefined
  const usesLiquidGlass = process.env.EXPO_OS === "ios" && isLiquidGlassAvailable()
  const editorCardStyle = {
    borderRadius: 26,
    borderCurve: "continuous" as const,
    borderWidth: 1,
    borderColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.65)",
    boxShadow: resolvedTheme === "dark"
      ? "0 10px 28px rgba(0, 0, 0, 0.28)"
      : "0 10px 28px rgba(15, 23, 42, 0.08)"
  }
  const selectedTabIndex = MEDIA_EDITOR_TABS.findIndex((item) => item.value === tab)

  function selectTab(nextTab: MediaEditorTab) {
    if (nextTab === tab) return
    Keyboard.dismiss()
    onTabChange(nextTab)
  }

  function shiftTab(direction: -1 | 1) {
    const next = MEDIA_EDITOR_TABS[selectedTabIndex + direction]
    if (!next) return
    Keyboard.dismiss()
    onTabChange(next.value)
  }

  const tabSwipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gestureState) =>
      Math.abs(gestureState.dx) > 24 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.35,
    onPanResponderRelease: (_event, gestureState) => {
      if (Math.abs(gestureState.dx) < 56 || Math.abs(gestureState.dy) > 36) return
      if (gestureState.dx < 0) {
        shiftTab(1)
        return
      }
      shiftTab(-1)
    }
  })

  useEffect(() => {
    const suggested = Math.max(getSuggestedEpisodeNumber(draft), 1)
    setEpisodeDraft(String(suggested))
  }, [draft.episodeHistoryDraft, draft.episodesWatched, draft.episodes])

  useEffect(() => {
    setEpisodeDateDrafts({})
  }, [draft.episodeHistoryDraft])

  useEffect(() => {
    const query = draft.title.trim()
    if (query.length < 2) {
      setMetadataSearchLoading(false)
      setMetadataSearchResults([])
      return
    }

    let active = true
    const timer = setTimeout(async () => {
      setMetadataSearchLoading(true)
      try {
        const response = await backendFetch<MetadataSearchResponse>(`/api/metadata/search?q=${encodeURIComponent(query)}`)
        if (!active) return
        setMetadataSearchResults(response.results ?? [])
      } catch {
        if (!active) return
        setMetadataSearchResults([])
      } finally {
        if (active) {
          setMetadataSearchLoading(false)
        }
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [draft.title])

  const messageColor = messageTone === "danger" ? palette.danger : palette.primary
  const ratingValue = toNumberOrNull(draft.myRating)
  const ratingStars = formatRatingStars(ratingValue)
  const derivedTimeTaken = deriveTimeTakenLabel(draft.startDate, draft.finishDate)
  const totalEpisodes = toNumberOrNull(draft.episodes)
  const pendingEpisode = toNumberOrNull(episodeDraft)
  const canAddEpisode = Boolean(pendingEpisode && pendingEpisode > 0 && (!totalEpisodes || pendingEpisode <= totalEpisodes))
  const sortedEpisodeHistory = draft.episodeHistoryDraft
    .map((record, originalIndex) => ({ record, originalIndex }))
    .sort((left, right) => {
      if (right.record.episode !== left.record.episode) return right.record.episode - left.record.episode
      return new Date(right.record.watched_at).getTime() - new Date(left.record.watched_at).getTime()
    })

  return (
    <ScreenScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 36, gap: 18 }}
      {...tabSwipeResponder.panHandlers}
    >
      {message ? (
        <Text selectable style={{ color: messageColor, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
          {message}
        </Text>
      ) : null}

      <FrostedPanel palette={palette} resolvedTheme={resolvedTheme} usesLiquidGlass={usesLiquidGlass} style={{ padding: 3, borderRadius: 22 }}>
        <NativeSegmentedControl
          value={tab}
          options={MEDIA_EDITOR_TABS}
          onChange={selectTab}
          appearance={resolvedTheme}
          backgroundColor="transparent"
          style={{ height: 44 }}
          tabStyle={{ borderRadius: 20 }}
          sliderStyle={{
            borderRadius: 20,
            backgroundColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.84)"
          }}
          fontStyle={{
            color: String(palette.textMuted),
            fontSize: 13,
            fontWeight: "600"
          }}
          activeFontStyle={{
            color: String(palette.text),
            fontSize: 13,
            fontWeight: "700"
          }}
        />
      </FrostedPanel>

      {tab === "general" ? (
        <>
          <GroupedSection cardStyle={editorCardStyle}>
            <View style={{ gap: 0 }}>
              <View
                style={{
                  height: 304,
                  overflow: "hidden",
                  backgroundColor: resolvedTheme === "dark" ? palette.surfaceMuted : "#eef1f6",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {draft.posterUrl ? (
                  <Image source={{ uri: draft.posterUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <View
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: 18,
                      borderCurve: "continuous",
                      backgroundColor: resolvedTheme === "dark" ? palette.surfaceRaised : "#a7b3c6",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Ionicons name="image-outline" size={34} color="#ffffff" />
                  </View>
                )}
              </View>

              <View style={{ padding: 22, gap: 16 }}>
                <View style={{ gap: 4 }}>
                  <Text selectable style={{ color: palette.text, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 }}>
                    Upload Poster
                  </Text>
                  <Text selectable style={{ color: palette.textMuted, fontSize: 15, lineHeight: 21 }}>
                    Select an image from your library
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => ({
                    minHeight: 50,
                    borderRadius: 999,
                    borderCurve: "continuous",
                    backgroundColor: palette.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 18,
                    boxShadow: pressed ? "0 6px 14px rgba(10, 132, 255, 0.18)" : "0 10px 24px rgba(10, 132, 255, 0.24)",
                    opacity: uploadingPoster ? 0.65 : pressed ? 0.88 : 1
                  })}
                  onPress={onUploadPoster}
                  disabled={uploadingPoster}
                >
                  <Text selectable style={{ color: palette.primaryText, fontSize: 16, fontWeight: "700" }}>
                    {uploadingPoster ? "Uploading..." : "Choose File"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </GroupedSection>

          <GroupedSection
            title="TITLE & METADATA"
            footer="Start typing a title to search, then use Match to pull metadata into the draft."
            titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}
            cardStyle={editorCardStyle}
          >
            <FieldShell>
              <FieldLabel label="Title" required />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="Search or enter movie title"
                trailingAccessory={<Ionicons name="search" size={22} color={palette.textMuted as string} />}
                value={draft.title}
                onChangeText={(value) => onDraftChange({ title: value })}
              />
            </FieldShell>

            {metadataSearchLoading ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <ActivityIndicator color={palette.primary} />
              </View>
            ) : null}

            {metadataSearchResults.length > 0 ? (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
                {metadataSearchResults.slice(0, 5).map((result) => (
                  <Pressable
                    key={result.id}
                    style={{
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 16,
                      borderCurve: "continuous",
                      backgroundColor: palette.surfaceMuted,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      gap: 3
                    }}
                    onPress={() => {
                      setMetadataSearchResults([])
                      onDraftChange({ title: result.title })
                      onFetchMetadata({ title: result.title, imdb_id: result.imdb_id ?? undefined })
                    }}
                  >
                    <Text selectable style={{ color: palette.text, fontSize: 15, fontWeight: "700" }}>
                      {result.title}
                    </Text>
                    <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
                      {result.year ?? "-"} • {result.media_type.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Divider color={palette.border} />

            <FieldShell>
              <FieldLabel label="Actions" />
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <ActionButton
                  palette={palette}
                  disabled={fetchingMetadata}
                  filled
                  label={fetchingMetadata ? "Matching..." : "Match Metadata"}
                  onPress={() => onFetchMetadata()}
                />
              </View>
            </FieldShell>
          </GroupedSection>

          <GroupedSection title="DETAILS" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <FieldShell>
              <FieldLabel label="Status" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {MEDIA_STATUS_OPTIONS.map((statusOption) => {
                  const selected = draft.status === statusOption
                  return (
                    <Pressable
                      key={statusOption}
                      onPress={() => onDraftChange({ status: statusOption })}
                      style={{
                        borderWidth: 1,
                        borderColor: selected ? palette.primary : palette.border,
                        backgroundColor: selected ? palette.primary : palette.surfaceMuted,
                        borderRadius: 999,
                        borderCurve: "continuous",
                        paddingHorizontal: 12,
                        paddingVertical: 8
                      }}
                    >
                      <Text selectable style={{ color: selected ? palette.primaryText : palette.text, fontSize: 12, fontWeight: "700" }}>
                        {statusOption}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </FieldShell>

            <Divider color={palette.border} />

            <FieldShell>
              <FieldLabel label="Medium" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="Movie"
                value={draft.medium}
                onChangeText={(value) => onDraftChange({ medium: value })}
              />
            </FieldShell>

            <Divider color={palette.border} />

            <FieldShell>
              <FieldLabel label="Platform" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="None"
                value={draft.platform}
                onChangeText={(value) => onDraftChange({ platform: value })}
              />
            </FieldShell>

            <Divider color={palette.border} />

            <FieldShell>
              <FieldLabel label="IMDb ID" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="tt1234567 or paste IMDb URL"
                value={draft.imdbId}
                onChangeText={(value) => onDraftChange({ imdbId: value })}
              />
            </FieldShell>
          </GroupedSection>

          <GroupedSection title="DATES & PROGRESS" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <NativeDateField label="Start Date" value={draft.startDate} onChange={(value) => onDraftChange({ startDate: value })} />
                </View>
                <View style={{ flex: 1 }}>
                  <NativeDateField label="Finish Date" value={draft.finishDate} onChange={(value) => onDraftChange({ finishDate: value })} />
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <FieldLabel label="Episodes Watched" />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <InlineInput
                    palette={palette}
                    resolvedTheme={resolvedTheme}
                    inputAccessoryViewID={keyboardAccessoryId}
                    placeholder="0"
                    value={draft.episodesWatched}
                    onChangeText={(value) => onDraftChange({ episodesWatched: value })}
                    keyboardType="numeric"
                  />
                  <Text selectable style={{ color: palette.textMuted, fontSize: 22, fontWeight: "700" }}>
                    /
                  </Text>
                  <InlineInput
                    palette={palette}
                    resolvedTheme={resolvedTheme}
                    inputAccessoryViewID={keyboardAccessoryId}
                    placeholder="1"
                    value={draft.episodes}
                    onChangeText={(value) => onDraftChange({ episodes: value })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <FieldLabel label="My Rating" />
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: 16,
                    borderCurve: "continuous",
                    backgroundColor: palette.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 10
                  }}
                >
                  <FieldInput
                    palette={palette}
                    resolvedTheme={resolvedTheme}
                    inputAccessoryViewID={keyboardAccessoryId}
                    placeholder="0.0"
                    value={draft.myRating}
                    onChangeText={(value) => onDraftChange({ myRating: value })}
                    keyboardType="decimal-pad"
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Text selectable style={{ color: palette.textMuted, fontSize: 24, letterSpacing: 1.5 }}>
                      {ratingStars}
                    </Text>
                    <Text selectable style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>
                      {ratingValue != null ? `${ratingValue.toFixed(1)}/10` : "0.0/10"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </GroupedSection>

          <GroupedSection title="POSTER URL" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <FieldShell>
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="https://..."
                value={draft.posterUrl}
                onChangeText={(value) => onDraftChange({ posterUrl: value })}
                autoCapitalize="none"
              />
            </FieldShell>
          </GroupedSection>

          <GroupedSection title="NOTES" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <FieldShell>
              <TextInput
                editable={false}
                multiline
                textAlignVertical="top"
                placeholder="Notes are not yet supported for the main entry."
                placeholderTextColor={palette.textMuted}
                style={{
                  color: palette.textMuted,
                  fontSize: 15,
                  minHeight: 120,
                  padding: 0
                }}
              />
            </FieldShell>
          </GroupedSection>
        </>
      ) : null}

      {tab === "advanced" ? (
        <>
          <GroupedSection title="CLASSIFICATION" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <FieldShell>
              <FieldLabel label="Type" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="Select..."
                value={draft.type}
                onChangeText={(value) => onDraftChange({ type: value })}
              />
            </FieldShell>
            <Divider color={palette.border} />
            <FieldShell>
              <FieldLabel label="Season" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="e.g. Season 1, 2024"
                value={draft.season}
                onChangeText={(value) => onDraftChange({ season: value })}
              />
            </FieldShell>
            <Divider color={palette.border} />
            <FieldShell>
              <FieldLabel label="Length / Duration" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="e.g. 2h 30m, 120 min"
                value={draft.length}
                onChangeText={(value) => onDraftChange({ length: value })}
              />
            </FieldShell>
            <Divider color={palette.border} />
            <FieldShell>
              <FieldLabel label="Time Taken" />
              <ReadonlyValue palette={palette} value={derivedTimeTaken || "Auto-calculated from dates"} muted={!derivedTimeTaken} />
            </FieldShell>
          </GroupedSection>

          <GroupedSection title="RATINGS & PRICE" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <FieldShell>
              <FieldLabel label="Price" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="0.00"
                value={draft.price}
                onChangeText={(value) => onDraftChange({ price: value })}
                keyboardType="decimal-pad"
              />
            </FieldShell>
            <Divider color={palette.border} />
            <FieldShell>
              <FieldLabel label="Average Rating (IMDb/External)" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="e.g. 8.5"
                value={draft.averageRating}
                onChangeText={(value) => onDraftChange({ averageRating: value })}
                keyboardType="decimal-pad"
              />
            </FieldShell>
          </GroupedSection>

          <GroupedSection
            title="CATALOGING"
            footer="Separate multiple genres with commas."
            titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}
            cardStyle={editorCardStyle}
          >
            <FieldShell>
              <FieldLabel label="Language" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="English, Japanese"
                value={draft.language}
                onChangeText={(value) => onDraftChange({ language: value })}
              />
            </FieldShell>
            <Divider color={palette.border} />
            <FieldShell>
              <FieldLabel label="Genre(s)" />
              <FieldInput
                palette={palette}
                resolvedTheme={resolvedTheme}
                inputAccessoryViewID={keyboardAccessoryId}
                placeholder="Action, Drama, Comedy"
                value={draft.genre}
                onChangeText={(value) => onDraftChange({ genre: value })}
              />
            </FieldShell>
          </GroupedSection>
        </>
      ) : null}

      {tab === "episodes" ? (
        <>
          <GroupedSection title="EPISODE WATCH HISTORY" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
            <View style={{ padding: 16, gap: 14 }}>
              <View style={{ gap: 10 }}>
                <FieldLabel label="Next Episode" />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <InlineInput
                    palette={palette}
                    resolvedTheme={resolvedTheme}
                    inputAccessoryViewID={keyboardAccessoryId}
                    placeholder="1"
                    value={episodeDraft}
                    onChangeText={setEpisodeDraft}
                    keyboardType="numeric"
                  />
                  <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
                    <ActionButton
                      palette={palette}
                      filled
                      label="Add Episode"
                      disabled={!canAddEpisode}
                      onPress={() => {
                        if (!pendingEpisode || pendingEpisode <= 0) return
                        if (totalEpisodes && pendingEpisode > totalEpisodes) return
                        onAddEpisode(pendingEpisode)
                      }}
                    />
                    <ActionButton palette={palette} label="Finished Today" onPress={onFinishedToday} />
                  </View>
                </View>
              </View>

              {sortedEpisodeHistory.length === 0 ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: 20,
                    borderCurve: "continuous",
                    backgroundColor: palette.surfaceMuted,
                    paddingHorizontal: 18,
                    paddingVertical: 28,
                    gap: 6,
                    alignItems: "center"
                  }}
                >
                  <Text selectable style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>
                    No episodes recorded yet
                  </Text>
                  <Text selectable style={{ color: palette.textMuted, fontSize: 14, textAlign: "center" }}>
                    Add an episode to start tracking progress.
                  </Text>
                </View>
              ) : (
                sortedEpisodeHistory.map(({ record, originalIndex }) => {
                  const inputValue = episodeDateDrafts[originalIndex] ?? toEpisodeDateInputValue(record.watched_at)
                  return (
                    <View
                      key={`${record.episode}-${record.watched_at}-${originalIndex}`}
                      style={{
                        borderWidth: 1,
                        borderColor: palette.border,
                        borderRadius: 20,
                        borderCurve: "continuous",
                        backgroundColor: palette.surface,
                        padding: 14,
                        gap: 12
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            borderCurve: "continuous",
                            backgroundColor: palette.surfaceMuted,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Text selectable style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}>
                            {record.episode}
                          </Text>
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                          <Text selectable style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>
                            Episode {record.episode}
                          </Text>
                          <Text selectable style={{ color: palette.textMuted, fontSize: 14 }}>
                            {formatEditorDateTime(record.watched_at)}
                          </Text>
                          <View
                            style={{
                              alignSelf: "flex-start",
                              borderWidth: 1,
                              borderColor: palette.border,
                              borderRadius: 999,
                              borderCurve: "continuous",
                              paddingHorizontal: 10,
                              paddingVertical: 5
                            }}
                          >
                            <Text selectable style={{ color: palette.text, fontSize: 12, fontWeight: "700" }}>
                              {formatRelativeDate(record.watched_at)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={{ gap: 10 }}>
                        <FieldInput
                          palette={palette}
                          resolvedTheme={resolvedTheme}
                          inputAccessoryViewID={keyboardAccessoryId}
                          placeholder="YYYY-MM-DDTHH:mm"
                          value={inputValue}
                          onChangeText={(value) => setEpisodeDateDrafts((prev) => ({ ...prev, [originalIndex]: value }))}
                          autoCapitalize="none"
                        />
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <ActionButton
                            palette={palette}
                            label="Save"
                            onPress={() => {
                              const nextValue = episodeDateDrafts[originalIndex] ?? inputValue
                              onUpdateEpisodeDate(originalIndex, nextValue)
                            }}
                          />
                          <ActionButton danger palette={palette} label="Remove" onPress={() => onDeleteEpisode(originalIndex)} />
                        </View>
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          </GroupedSection>
        </>
      ) : null}

      {tab === "history" ? (
        <GroupedSection title="STATUS HISTORY" titleStyle={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }} cardStyle={editorCardStyle}>
          <View style={{ padding: 16, gap: 12 }}>
            {!isPersisted ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  backgroundColor: palette.surfaceMuted,
                  paddingHorizontal: 18,
                  paddingVertical: 24,
                  gap: 6
                }}
              >
                <Text selectable style={{ color: palette.text, fontSize: 17, fontWeight: "700" }}>
                  Save the entry first
                </Text>
                <Text selectable style={{ color: palette.textMuted, fontSize: 14 }}>
                  Status history will appear here after the entry exists and statuses change.
                </Text>
              </View>
            ) : historyLoading ? (
              <ActivityIndicator color={palette.primary} />
            ) : statusHistory.length === 0 ? (
              <Text selectable style={{ color: palette.textMuted, fontSize: 15 }}>
                No history found.
              </Text>
            ) : (
              statusHistory.map((historyItem) => (
                <View
                  key={historyItem.id}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: 18,
                    borderCurve: "continuous",
                    backgroundColor: palette.surface,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 4
                  }}
                >
                  <Text selectable style={{ color: palette.text, fontSize: 14, fontWeight: "700" }}>
                    {historyItem.old_status ?? "None"} {"->"} {historyItem.new_status}
                  </Text>
                  <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
                    {formatEditorDateTime(historyItem.changed_at)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </GroupedSection>
      ) : null}

      <View style={{ gap: 10, paddingTop: 4 }}>
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => ({
            minHeight: 52,
            borderRadius: 18,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.primary,
            paddingHorizontal: 18,
            opacity: saving ? 0.6 : pressed ? 0.82 : 1
          })}
        >
          <Text selectable style={{ color: palette.primaryText, fontSize: 16, fontWeight: "700" }}>
            {saving ? "Saving..." : saveLabel}
          </Text>
        </Pressable>

        {showDelete && onDelete ? (
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => ({
              minHeight: 52,
              borderRadius: 18,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 59, 48, 0.12)",
              paddingHorizontal: 18,
              opacity: pressed ? 0.82 : 1
            })}
          >
            <Text selectable style={{ color: palette.danger, fontSize: 16, fontWeight: "700" }}>
              Delete
            </Text>
          </Pressable>
        ) : null}
      </View>

      {keyboardAccessoryId ? (
        <InputAccessoryView nativeID={keyboardAccessoryId}>
          <View
            style={{
              backgroundColor: palette.surface,
              borderTopWidth: 1,
              borderTopColor: palette.border,
              paddingHorizontal: 14,
              paddingVertical: 8,
              alignItems: "flex-end"
            }}
          >
            <Pressable onPress={() => Keyboard.dismiss()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, paddingVertical: 4 })}>
              <Text selectable style={{ color: palette.primary, fontSize: 17, fontWeight: "600" }}>
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </ScreenScrollView>
  )
}

function FrostedPanel({
  children,
  palette,
  resolvedTheme,
  usesLiquidGlass,
  style
}: {
  children: ReactNode
  palette: ReturnType<typeof useAppTheme>["palette"]
  resolvedTheme: ReturnType<typeof useAppTheme>["resolvedTheme"]
  usesLiquidGlass: boolean
  style?: ComponentProps<typeof View>["style"]
}) {
  const baseStyle = [
    {
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
      backgroundColor: "transparent",
      boxShadow: resolvedTheme === "dark"
        ? "0 8px 22px rgba(0, 0, 0, 0.22)"
        : "0 8px 20px rgba(15, 23, 42, 0.07)"
    },
    style
  ]

  if (usesLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={resolvedTheme}
        style={baseStyle}
      >
        {children}
      </GlassView>
    )
  }

  return (
    <BlurView tint={resolvedTheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} intensity={90} style={baseStyle}>
      {children}
    </BlurView>
  )
}

function FieldShell({ children }: { children: ReactNode }) {
  return <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 10 }}>{children}</View>
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  const { palette } = useAppTheme()

  return (
    <Text selectable style={{ color: palette.textMuted, fontSize: 13, fontWeight: "700" }}>
      {label}
      {required ? <Text selectable style={{ color: palette.danger }}> *</Text> : null}
    </Text>
  )
}

function FieldInput({
  palette,
  resolvedTheme,
  trailingAccessory,
  ...props
}: ComponentProps<typeof TextInput> & {
  palette: ReturnType<typeof useAppTheme>["palette"]
  resolvedTheme: ReturnType<typeof useAppTheme>["resolvedTheme"]
  trailingAccessory?: ReactNode
}) {
  return (
    <View
      style={{
        minHeight: 56,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: palette.surfaceMuted,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12
      }}
    >
      <TextInput
        autoCorrect={false}
        clearButtonMode={process.env.EXPO_OS === "ios" ? "while-editing" : "never"}
        keyboardAppearance={resolvedTheme}
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.primary as string}
        style={{
          flex: 1,
          color: palette.text,
          fontSize: 17,
          padding: 0
        }}
        {...props}
      />
      {trailingAccessory}
    </View>
  )
}

function InlineInput({
  palette,
  resolvedTheme,
  ...props
}: ComponentProps<typeof TextInput> & {
  palette: ReturnType<typeof useAppTheme>["palette"]
  resolvedTheme: ReturnType<typeof useAppTheme>["resolvedTheme"]
}) {
  return (
    <View
      style={{
        minWidth: 88,
        minHeight: 48,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: palette.surfaceMuted,
        paddingHorizontal: 14,
        paddingVertical: 12,
        justifyContent: "center"
      }}
    >
      <FieldInput palette={palette} resolvedTheme={resolvedTheme} {...props} />
    </View>
  )
}

function ReadonlyValue({
  palette,
  value,
  muted = false
}: {
  palette: ReturnType<typeof useAppTheme>["palette"]
  value: string
  muted?: boolean
}) {
  return (
    <Text selectable style={{ color: muted ? palette.textMuted : palette.text, fontSize: 17 }}>
      {value}
    </Text>
  )
}

function ActionButton({
  palette,
  label,
  onPress,
  disabled = false,
  filled = false,
  danger = false
}: {
  palette: ReturnType<typeof useAppTheme>["palette"]
  label: string
  onPress: () => void
  disabled?: boolean
  filled?: boolean
  danger?: boolean
}) {
  const backgroundColor = danger ? palette.surface : filled ? palette.primary : palette.surface
  const secondaryBackgroundColor = danger ? "rgba(255, 59, 48, 0.12)" : palette.surfaceMuted
  const textColor = danger ? palette.danger : filled ? palette.primaryText : palette.primary

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        backgroundColor: filled ? backgroundColor : secondaryBackgroundColor,
        borderRadius: 16,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        opacity: disabled ? 0.6 : pressed ? 0.82 : 1
      })}
    >
      <Text selectable style={{ color: textColor, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  )
}

function Divider({ color }: { color: ColorValue }) {
  return <View style={{ height: 1, backgroundColor: color, marginLeft: 16 }} />
}
