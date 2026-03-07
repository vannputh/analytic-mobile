import { useEffect, useState } from "react"
import Ionicons from "@expo/vector-icons/Ionicons"
import type { ColorValue } from "react-native"
import { Keyboard, KeyboardAvoidingView, Pressable, Text } from "react-native"
import { Stack, useRouter } from "expo-router"
import { MediaEditorContent } from "@/src/features/media/components/media-editor-content"
import { MediaMetadataConflictModal } from "@/src/features/media/components/media-metadata-conflict-modal"
import { useMediaEntries } from "@/src/features/media/hooks/useMediaEntries"
import { setPendingMediaFlashMessage } from "@/src/features/media/lib/media-flash-message"
import {
  addEpisodeToDraft,
  applyMetadataSelection,
  buildMediaEditorDraft,
  buildMediaEntryPayloadFromDraft,
  buildMetadataSelectionFromDraft,
  deleteEpisodeHistoryItem,
  markFinishedTodayInDraft,
  updateEpisodeHistoryDate,
  type MediaEditorDraft,
  type MediaEditorTab,
  type PendingMediaMetadataSelection
} from "@/src/features/media/lib/media-editor"
import { backendFetch } from "@/src/shared/api/backend"
import { uploadAssetToBackend } from "@/src/shared/api/upload"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { MediaEntry, MediaStatusHistory } from "@/src/shared/types/database"

function HeaderButton({
  color,
  disabled,
  icon,
  iconSize = 24,
  label,
  onPress
}: {
  color: ColorValue
  disabled: boolean
  icon?: keyof typeof Ionicons.glyphMap
  iconSize?: number
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1
      })}
    >
      {icon ? (
        <Ionicons name={icon} size={iconSize} color={color} />
      ) : (
        <Text selectable style={{ color, fontSize: 17, fontWeight: "600" }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function MediaAddScreen() {
  const router = useRouter()
  const { palette } = useAppTheme()
  const { createEntry, updateEntry, deleteEntry, getStatusHistory, creating, updating, deleting } = useMediaEntries({
    enabled: false
  })
  const [tab, setTab] = useState<MediaEditorTab>("general")
  const [draft, setDraft] = useState<MediaEditorDraft>(buildMediaEditorDraft)
  const [currentEntry, setCurrentEntry] = useState<MediaEntry | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<"default" | "danger">("default")
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [pendingMetadata, setPendingMetadata] = useState<PendingMediaMetadataSelection | null>(null)
  const [statusHistory, setStatusHistory] = useState<MediaStatusHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [closeFlashMessage, setCloseFlashMessage] = useState<string | null>(null)

  const saving = creating || updating
  const currentEntryId = currentEntry?.id ?? null

  useEffect(() => {
    if (!currentEntryId) {
      setStatusHistory([])
      setHistoryLoading(false)
      return
    }

    if (tab !== "history") {
      setHistoryLoading(false)
      return
    }

    let active = true
    const entryId = currentEntryId

    async function loadStatusHistory() {
      setHistoryLoading(true)
      try {
        const history = await getStatusHistory(entryId)
        if (!active) return
        setStatusHistory(history)
      } catch {
        if (!active) return
        setStatusHistory([])
      } finally {
        if (active) {
          setHistoryLoading(false)
        }
      }
    }

    void loadStatusHistory()

    return () => {
      active = false
    }
  }, [currentEntryId, getStatusHistory, tab])

  function setEditorMessage(nextMessage: string | null, tone: "default" | "danger" = "default") {
    setMessage(nextMessage)
    setMessageTone(tone)
  }

  function updateDraft(patch: Partial<MediaEditorDraft>) {
    setPendingMetadata(null)
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function closeEditor() {
    Keyboard.dismiss()
    if (closeFlashMessage) {
      setPendingMediaFlashMessage(closeFlashMessage)
    }
    router.back()
  }

  async function saveEditor() {
    Keyboard.dismiss()
    const payload = buildMediaEntryPayloadFromDraft(draft)
    if (!payload.title.trim()) {
      setEditorMessage("Title is required", "danger")
      setTab("general")
      return
    }

    setEditorMessage(null)

    try {
      if (currentEntry) {
        const updatedEntry = await updateEntry({ id: currentEntry.id, payload })
        setCurrentEntry(updatedEntry)
        setDraft(buildMediaEditorDraft(updatedEntry))
        setCloseFlashMessage("Entry updated")
        setEditorMessage("Entry updated")
      } else {
        const createdEntry = await createEntry(payload)
        setCurrentEntry(createdEntry)
        setDraft(buildMediaEditorDraft(createdEntry))
        setCloseFlashMessage("Entry added")
        setEditorMessage("Entry added")
      }
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Failed to save entry", "danger")
    }
  }

  async function deleteCurrentEntry() {
    if (!currentEntry) return

    Keyboard.dismiss()
    try {
      await deleteEntry(currentEntry.id)
      setPendingMediaFlashMessage("Entry deleted")
      router.back()
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Failed to delete entry", "danger")
    }
  }

  async function fetchMetadata(paramsOverride?: { title?: string; imdb_id?: string }) {
    const titleParam = paramsOverride?.title ?? draft.title.trim()
    const imdbIdParam = paramsOverride?.imdb_id ?? draft.imdbId.trim()
    if (!titleParam && !imdbIdParam) {
      setEditorMessage("Enter a title or IMDb ID first", "danger")
      return
    }

    setFetchingMetadata(true)
    setEditorMessage(null)
    try {
      const params = new URLSearchParams()
      if (titleParam) params.set("title", titleParam)
      if (imdbIdParam) params.set("imdb_id", imdbIdParam)
      if (draft.medium === "Movie") params.set("type", "movie")
      if (draft.medium === "TV Show") params.set("type", "series")
      if (draft.season.trim()) params.set("season", draft.season.trim())
      params.set("source", "tmdb")

      const metadata = await backendFetch<Record<string, unknown>>(`/api/metadata?${params.toString()}`)
      const { immediatePatch, pendingSelection } = buildMetadataSelectionFromDraft(metadata, draft)
      if (Object.keys(immediatePatch).length > 0) {
        updateDraft(immediatePatch)
      }

      if (pendingSelection) {
        setPendingMetadata(pendingSelection)
        setEditorMessage("Metadata fetched. Review conflicting fields.")
      } else {
        setEditorMessage("Metadata fetched")
      }
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Failed to fetch metadata", "danger")
    } finally {
      setFetchingMetadata(false)
    }
  }

  function toggleMetadataField(field: keyof PendingMediaMetadataSelection["selections"]) {
    setPendingMetadata((prev) =>
      prev
        ? {
            ...prev,
            selections: { ...prev.selections, [field]: !prev.selections[field] }
          }
        : prev
    )
  }

  function applyPendingMetadataSelection() {
    if (!pendingMetadata) return
    const patch = applyMetadataSelection(pendingMetadata)
    if (Object.keys(patch).length > 0) {
      updateDraft(patch)
    }
    setPendingMetadata(null)
    setEditorMessage("Metadata applied")
  }

  async function uploadPoster() {
    const ImagePicker = await import("expo-image-picker")
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setEditorMessage("Photo library permission is required", "danger")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    })
    if (result.canceled || !result.assets.length) return

    const asset = result.assets[0]
    setUploadingPoster(true)
    setEditorMessage(null)

    try {
      const uploaded = await uploadAssetToBackend({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        title: draft.title || "poster"
      })
      updateDraft({ posterUrl: uploaded.url })
      setEditorMessage("Poster uploaded")
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Failed to upload poster", "danger")
    } finally {
      setUploadingPoster(false)
    }
  }

  function addEpisode(episode: number) {
    setDraft((prev) => addEpisodeToDraft(prev, episode))
    setEditorMessage(`Logged episode ${episode}`)
  }

  function finishToday() {
    const nextDraft = markFinishedTodayInDraft(draft)
    if (!nextDraft) {
      setEditorMessage("Set total episodes first or add remaining episodes before finishing today", "danger")
      return
    }
    const nextCount = nextDraft.episodeHistoryDraft.length - draft.episodeHistoryDraft.length
    setDraft(nextDraft)
    setEditorMessage(`Logged remaining ${nextCount} episode${nextCount === 1 ? "" : "s"}`)
  }

  function updateEpisodeDate(index: number, watchedAt: string) {
    if (!watchedAt.trim()) {
      setEditorMessage("Enter a valid date/time value", "danger")
      return
    }

    const parsed = new Date(watchedAt)
    if (Number.isNaN(parsed.getTime())) {
      setEditorMessage("Invalid episode date", "danger")
      return
    }

    setDraft((prev) => updateEpisodeHistoryDate(prev, index, parsed.toISOString()))
    setEditorMessage("Episode history updated")
  }

  function removeEpisode(index: number) {
    setDraft((prev) => deleteEpisodeHistoryItem(prev, index))
    setEditorMessage("Episode entry removed")
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add New Entry",
          headerLargeTitle: false,
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton color={palette.primary} disabled={saving || deleting} icon="close" iconSize={24} label="Close" onPress={closeEditor} />
          ),
          headerRight: () => (
            currentEntry ? (
              <HeaderButton
                color={palette.primary}
                disabled={saving || deleting}
                label={saving ? "Saving..." : "Done"}
                onPress={() => {
                  void saveEditor()
                }}
              />
            ) : (
              <HeaderButton
                color={palette.primary}
                disabled={saving || deleting}
                icon="add"
                iconSize={26}
                label="Add"
                onPress={() => {
                  void saveEditor()
                }}
              />
            )
          )
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <MediaEditorContent
          draft={draft}
          tab={tab}
          message={message}
          messageTone={messageTone}
          saving={saving}
          uploadingPoster={uploadingPoster}
          fetchingMetadata={fetchingMetadata}
          historyLoading={historyLoading}
          isPersisted={Boolean(currentEntry)}
          statusHistory={statusHistory}
          showDelete={Boolean(currentEntry)}
          onTabChange={setTab}
          onDraftChange={updateDraft}
          onSave={() => {
            void saveEditor()
          }}
          onDelete={() => {
            void deleteCurrentEntry()
          }}
          onUploadPoster={() => {
            void uploadPoster()
          }}
          onFetchMetadata={(params) => {
            void fetchMetadata(params)
          }}
          onAddEpisode={addEpisode}
          onFinishedToday={finishToday}
          onUpdateEpisodeDate={updateEpisodeDate}
          onDeleteEpisode={removeEpisode}
        />
      </KeyboardAvoidingView>

      <MediaMetadataConflictModal
        pendingSelection={pendingMetadata}
        onToggleField={toggleMetadataField}
        onApply={applyPendingMetadataSelection}
        onSkip={() => setPendingMetadata(null)}
      />
    </>
  )
}
