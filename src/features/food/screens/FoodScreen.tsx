import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"
import * as ImagePicker from "expo-image-picker"
import { useFoodEntries } from "@/src/features/food/hooks/useFoodEntries"
import { backendFetch } from "@/src/shared/api/backend"
import { uploadAssetToBackend } from "@/src/shared/api/upload"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { FoodEntry, FoodEntryImage, FoodItem } from "@/src/shared/types/database"

interface FoodFormState {
  name: string
  branch: string
  visitDate: string
  category: string
  address: string
  googleMapsUrl: string
  neighborhood: string
  city: string
  country: string
  instagramHandle: string
  websiteUrl: string
  cuisineTypes: string
  tags: string
  itemsText: string
  favoriteItem: string
  overallRating: string
  foodRating: string
  ambianceRating: string
  serviceRating: string
  valueRating: string
  totalPrice: string
  currency: string
  priceLevel: string
  diningType: string
  wouldReturn: "" | "yes" | "no"
  notes: string
}

interface PlaceDetailsResponse {
  name?: string
  address?: string
  website?: string
  priceLevel?: string | null
  neighborhood?: string | null
  city?: string | null
  country?: string | null
  googleMapsUrl?: string
  photos?: string[] | null
}

interface QueuedImage {
  id: string
  image_url: string
  storage_path: string
  is_primary: boolean
  caption: string | null
}

interface CalendarCell {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

type FormTab = "general" | "location" | "items" | "ratings" | "notes"
type DetailTab = "overview" | "details" | "notes"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toCsv(value: string[] | null | undefined): string {
  if (!value || value.length === 0) return ""
  return value.join(", ")
}

function parseCsv(value: string): string[] | null {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

function parseItemsText(value: string): FoodItem[] | null {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return null

  const items: FoodItem[] = []
  for (const line of lines) {
    const [namePart, pricePart, categoryPart, imagePart] = line.split("|").map((piece) => piece?.trim() ?? "")
    if (!namePart) continue
    items.push({
      name: namePart,
      price: toNumberOrNull(pricePart),
      image_url: imagePart || null,
      category: categoryPart || null,
      categories: categoryPart ? [categoryPart] : null
    })
  }

  return items.length > 0 ? items : null
}

function itemsToText(items: FoodItem[] | null | undefined): string {
  if (!items || items.length === 0) return ""
  return items
    .map((item) => {
      const pricePart = item.price != null ? String(item.price) : ""
      const categoryPart = item.category ?? ""
      const imagePart = item.image_url ?? ""
      return [item.name, pricePart, categoryPart, imagePart].join("|")
    })
    .join("\n")
}

function formatVisitDate(date: string): string {
  if (!date) return "-"
  return date
}

function buildFormFromEntry(entry: FoodEntry, visitDateOverride?: string): FoodFormState {
  return {
    name: entry.name,
    branch: entry.branch ?? "",
    visitDate: visitDateOverride ?? entry.visit_date,
    category: entry.category ?? "",
    address: entry.address ?? "",
    googleMapsUrl: entry.google_maps_url ?? "",
    neighborhood: entry.neighborhood ?? "",
    city: entry.city ?? "",
    country: entry.country ?? "",
    instagramHandle: entry.instagram_handle ?? "",
    websiteUrl: entry.website_url ?? "",
    cuisineTypes: toCsv(entry.cuisine_type),
    tags: toCsv(entry.tags),
    itemsText: itemsToText(entry.items_ordered),
    favoriteItem: entry.favorite_item ?? "",
    overallRating: entry.overall_rating != null ? String(entry.overall_rating) : "",
    foodRating: entry.food_rating != null ? String(entry.food_rating) : "",
    ambianceRating: entry.ambiance_rating != null ? String(entry.ambiance_rating) : "",
    serviceRating: entry.service_rating != null ? String(entry.service_rating) : "",
    valueRating: entry.value_rating != null ? String(entry.value_rating) : "",
    totalPrice: entry.total_price != null ? String(entry.total_price) : "",
    currency: entry.currency ?? "USD",
    priceLevel: entry.price_level ?? "",
    diningType: entry.dining_type ?? "",
    wouldReturn: entry.would_return === true ? "yes" : entry.would_return === false ? "no" : "",
    notes: entry.notes ?? ""
  }
}

function createDefaultForm(initialDate?: string): FoodFormState {
  return {
    name: "",
    branch: "",
    visitDate: initialDate ?? toDateKey(new Date()),
    category: "Restaurant",
    address: "",
    googleMapsUrl: "",
    neighborhood: "",
    city: "",
    country: "Cambodia",
    instagramHandle: "",
    websiteUrl: "",
    cuisineTypes: "",
    tags: "",
    itemsText: "",
    favoriteItem: "",
    overallRating: "",
    foodRating: "",
    ambianceRating: "",
    serviceRating: "",
    valueRating: "",
    totalPrice: "",
    currency: "USD",
    priceLevel: "",
    diningType: "",
    wouldReturn: "",
    notes: ""
  }
}

function isSameMonth(isoDate: string, year: number, monthIndex: number): boolean {
  const date = new Date(`${isoDate}T00:00:00`)
  return date.getFullYear() === year && date.getMonth() === monthIndex
}

function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const today = new Date()
  const firstDay = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekdayOffset = (firstDay.getDay() + 6) % 7
  const cells: CalendarCell[] = []

  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1
  const prevYear = monthIndex === 0 ? year - 1 : year
  const prevMonthDays = new Date(prevYear, prevMonth + 1, 0).getDate()

  for (let i = firstWeekdayOffset - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i
    const date = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    cells.push({ date, day, isCurrentMonth: false, isToday: false })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const isToday = today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === day
    cells.push({ date, day, isCurrentMonth: true, isToday })
  }

  const remaining = 42 - cells.length
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1
  const nextYear = monthIndex === 11 ? year + 1 : year
  for (let day = 1; day <= remaining; day += 1) {
    const date = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    cells.push({ date, day, isCurrentMonth: false, isToday: false })
  }

  return cells
}

function formatMonthYear(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  })
}

function matchesSearch(entry: FoodEntry, query: string): boolean {
  if (!query) return true
  const normalized = query.toLowerCase()
  if (entry.name.toLowerCase().includes(normalized)) return true
  if (entry.city?.toLowerCase().includes(normalized)) return true
  if (entry.neighborhood?.toLowerCase().includes(normalized)) return true
  if (entry.category?.toLowerCase().includes(normalized)) return true
  if (entry.cuisine_type?.some((item) => item.toLowerCase().includes(normalized))) return true
  return false
}

function foodTotal(entry: FoodEntry): number {
  if (entry.total_price != null) return entry.total_price
  if (!entry.items_ordered || entry.items_ordered.length === 0) return 0
  return entry.items_ordered.reduce((sum, item) => sum + (item.price ?? 0), 0)
}

export function FoodScreen() {
  const { palette } = useAppTheme()
  const {
    data,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    addEntryImage,
    setPrimaryEntryImage,
    deleteEntryImage,
    getEntryImages,
    refetch,
    addingImage,
    updating
  } = useFoodEntries()

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [formTab, setFormTab] = useState<FormTab>("general")
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)
  const [formState, setFormState] = useState<FoodFormState | null>(null)
  const [entryImages, setEntryImages] = useState<FoodEntryImage[]>([])
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>("overview")
  const [detailEntry, setDetailEntry] = useState<FoodEntry | null>(null)
  const [detailImages, setDetailImages] = useState<FoodEntryImage[]>([])

  const [saving, setSaving] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const entries = useMemo(() => {
    const all = data ?? []
    const query = search.trim().toLowerCase()
    return all.filter((entry) => matchesSearch(entry, query))
  }, [data, search])

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, FoodEntry[]> = {}
    for (const entry of entries) {
      if (!isSameMonth(entry.visit_date, currentYear, currentMonth)) continue
      const key = entry.visit_date
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(entry)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return grouped
  }, [entries, currentYear, currentMonth])

  const calendarCells = useMemo(() => buildCalendarCells(currentYear, currentMonth), [currentYear, currentMonth])

  const selectedEntries = useMemo(() => {
    if (!selectedDate) {
      return Object.entries(entriesByDate)
        .sort(([left], [right]) => new Date(right).getTime() - new Date(left).getTime())
        .flatMap(([, dayEntries]) => dayEntries)
    }
    return entriesByDate[selectedDate] ?? []
  }, [entriesByDate, selectedDate])

  const suggestions = useMemo(() => {
    if (!formState || editingEntry) return []
    const query = formState.name.trim().toLowerCase()
    if (query.length < 2) return []
    const seen = new Set<string>()
    const result: FoodEntry[] = []
    for (const entry of entries) {
      const key = `${entry.name}|${entry.branch ?? ""}`
      if (seen.has(key)) continue
      if (!entry.name.toLowerCase().includes(query)) continue
      seen.add(key)
      result.push(entry)
    }
    return result.slice(0, 6)
  }, [formState?.name, entries, editingEntry])

  const draftItems = useMemo(() => {
    if (!formState) return []
    return parseItemsText(formState.itemsText) ?? []
  }, [formState?.itemsText])

  function setDraftItems(nextItems: FoodItem[]) {
    setFormState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        itemsText: itemsToText(nextItems)
      }
    })
  }

  function addDraftItem() {
    const next = [...draftItems, { name: "", price: null, category: null, categories: null, image_url: null }]
    setDraftItems(next)
  }

  function updateDraftItem(index: number, patch: Partial<FoodItem>) {
    const next = [...draftItems]
    const current = next[index]
    if (!current) return
    const updated: FoodItem = {
      ...current,
      ...patch,
      categories:
        patch.category !== undefined
          ? patch.category
            ? [patch.category]
            : null
          : current.categories ?? (current.category ? [current.category] : null)
    }
    next[index] = updated
    setDraftItems(next)
  }

  function removeDraftItem(index: number) {
    const next = draftItems.filter((_, currentIndex) => currentIndex !== index)
    setDraftItems(next)
  }

  function goToPreviousMonth() {
    setSelectedDate(null)
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((prev) => prev - 1)
      return
    }
    setCurrentMonth((prev) => prev - 1)
  }

  function goToNextMonth() {
    setSelectedDate(null)
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((prev) => prev + 1)
      return
    }
    setCurrentMonth((prev) => prev + 1)
  }

  function goToToday() {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(null)
  }

  function closeFormModal() {
    setModalOpen(false)
    setFormState(null)
    setEditingEntry(null)
    setEntryImages([])
    setQueuedImages([])
    setAutofilling(false)
    setSaving(false)
    setUploading(false)
    setFormTab("general")
  }

  async function openDetails(entry: FoodEntry) {
    setDetailEntry(entry)
    setDetailTab("overview")
    setDetailsOpen(true)
    setMessage(null)
    try {
      const images = await getEntryImages(entry.id)
      setDetailImages(images)
    } catch {
      setDetailImages([])
    }
  }

  async function openEdit(entry: FoodEntry) {
    setEditingEntry(entry)
    setFormState(buildFormFromEntry(entry))
    setQueuedImages([])
    setModalOpen(true)
    setFormTab("general")
    setDetailsOpen(false)
    setMessage(null)
    try {
      const images = await getEntryImages(entry.id)
      setEntryImages(images)
    } catch {
      setEntryImages([])
    }
  }

  function openCreate(initialDate?: string) {
    setEditingEntry(null)
    setEntryImages([])
    setQueuedImages([])
    setFormState(createDefaultForm(initialDate))
    setModalOpen(true)
    setFormTab("general")
    setMessage(null)
  }

  function openDuplicate(entry: FoodEntry) {
    setEditingEntry(null)
    setEntryImages([])
    setQueuedImages([])
    setFormState(buildFormFromEntry(entry, toDateKey(new Date())))
    setModalOpen(true)
    setFormTab("general")
    setDetailsOpen(false)
    setMessage("Loaded previous entry as template")
  }

  function applySuggestion(entry: FoodEntry) {
    setFormState((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        name: entry.name,
        branch: entry.branch ?? "",
        category: entry.category ?? prev.category,
        address: entry.address ?? prev.address,
        googleMapsUrl: entry.google_maps_url ?? prev.googleMapsUrl,
        neighborhood: entry.neighborhood ?? prev.neighborhood,
        city: entry.city ?? prev.city,
        country: entry.country ?? prev.country,
        instagramHandle: entry.instagram_handle ?? prev.instagramHandle,
        websiteUrl: entry.website_url ?? prev.websiteUrl,
        cuisineTypes: toCsv(entry.cuisine_type),
        tags: toCsv(entry.tags)
      }
    })
  }

  async function autofillFromMaps() {
    if (!formState?.googleMapsUrl.trim()) {
      setMessage("Paste a Google Maps URL first")
      return
    }
    setAutofilling(true)
    setMessage(null)
    try {
      const response = await backendFetch<PlaceDetailsResponse>("/api/maps/place-details", {
        method: "POST",
        body: JSON.stringify({ url: formState.googleMapsUrl.trim() })
      })

      setFormState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          name: response.name?.trim() ? response.name : prev.name,
          address: response.address?.trim() ? response.address : prev.address,
          websiteUrl: response.website?.trim() ? response.website : prev.websiteUrl,
          priceLevel: response.priceLevel?.trim() ? response.priceLevel : prev.priceLevel,
          neighborhood: response.neighborhood?.trim() ? response.neighborhood : prev.neighborhood,
          city: response.city?.trim() ? response.city : prev.city,
          country: response.country?.trim() ? response.country : prev.country,
          googleMapsUrl: response.googleMapsUrl?.trim() ? response.googleMapsUrl : prev.googleMapsUrl
        }
      })

      if (response.photos && response.photos.length > 0) {
        if (editingEntry) {
          for (let index = 0; index < response.photos.length; index += 1) {
            const photo = response.photos[index]
            await addEntryImage({
              food_entry_id: editingEntry.id,
              storage_path: `external:${photo}`,
              image_url: photo,
              is_primary: entryImages.length === 0 && index === 0,
              caption: "Imported from maps"
            })
          }
          const refreshed = await getEntryImages(editingEntry.id)
          setEntryImages(refreshed)
        } else {
          const mapped: QueuedImage[] = response.photos.map((photo, index) => ({
            id: `map-photo-${Date.now()}-${index}`,
            image_url: photo,
            storage_path: `external:${photo}`,
            is_primary: queuedImages.length === 0 && index === 0,
            caption: "Imported from maps"
          }))
          setQueuedImages((prev) => [...prev, ...mapped])
        }
      }

      setMessage("Place details autofilled")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to parse map URL")
    } finally {
      setAutofilling(false)
    }
  }

  async function pickAndUploadImage() {
    if (!formState) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setMessage("Photo library permission is required to upload images")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9
    })
    if (result.canceled || !result.assets.length) return
    const asset = result.assets[0]

    setUploading(true)
    setMessage(null)
    try {
      const uploaded = await uploadAssetToBackend({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        title: formState.name || "food-image"
      })
      if (editingEntry) {
        await addEntryImage({
          food_entry_id: editingEntry.id,
          storage_path: uploaded.path,
          image_url: uploaded.url,
          is_primary: entryImages.length === 0,
          caption: null
        })
        const refreshed = await getEntryImages(editingEntry.id)
        setEntryImages(refreshed)
      } else {
        const queueItem: QueuedImage = {
          id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          image_url: uploaded.url,
          storage_path: uploaded.path,
          is_primary: queuedImages.length === 0,
          caption: null
        }
        setQueuedImages((prev) => [...prev, queueItem])
      }
      setMessage("Image uploaded")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  async function pickAndUploadItemImage(index: number) {
    if (!formState || !draftItems[index]) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setMessage("Photo library permission is required to upload images")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9
    })
    if (result.canceled || !result.assets.length) return
    const asset = result.assets[0]

    setUploading(true)
    setMessage(null)
    try {
      const uploaded = await uploadAssetToBackend({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        title: `${formState.name || "food-item"}-item-${index + 1}`
      })
      updateDraftItem(index, { image_url: uploaded.url })
      setMessage("Item image uploaded")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to upload item image")
    } finally {
      setUploading(false)
    }
  }

  async function copyToClipboard(value: string | null | undefined, label: string) {
    if (!value?.trim()) {
      setMessage(`No ${label.toLowerCase()} available`)
      return
    }
    try {
      await Clipboard.setStringAsync(value)
      setMessage(`${label} copied`)
    } catch {
      setMessage(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  async function handleMakePrimary(image: FoodEntryImage) {
    if (!editingEntry) return
    try {
      await setPrimaryEntryImage({ imageId: image.id, foodEntryId: editingEntry.id })
      const refreshed = await getEntryImages(editingEntry.id)
      setEntryImages(refreshed)
      setMessage("Primary image updated")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to set primary image")
    }
  }

  async function handleDeleteImage(image: FoodEntryImage) {
    if (!editingEntry) return
    try {
      await deleteEntryImage(image.id)
      const refreshed = await getEntryImages(editingEntry.id)
      setEntryImages(refreshed)
      setMessage("Image removed")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to remove image")
    }
  }

  async function saveEntry() {
    if (!formState) return
    const name = formState.name.trim()
    if (!name) {
      setMessage("Name is required")
      return
    }

    const payload: Partial<FoodEntry> = {
      name,
      branch: formState.branch.trim() || null,
      visit_date: formState.visitDate.trim() || toDateKey(new Date()),
      category: formState.category.trim() || null,
      address: formState.address.trim() || null,
      google_maps_url: formState.googleMapsUrl.trim() || null,
      neighborhood: formState.neighborhood.trim() || null,
      city: formState.city.trim() || null,
      country: formState.country.trim() || null,
      instagram_handle: formState.instagramHandle.trim() || null,
      website_url: formState.websiteUrl.trim() || null,
      cuisine_type: parseCsv(formState.cuisineTypes),
      tags: parseCsv(formState.tags),
      items_ordered: parseItemsText(formState.itemsText),
      favorite_item: formState.favoriteItem.trim() || null,
      overall_rating: toNumberOrNull(formState.overallRating),
      food_rating: toNumberOrNull(formState.foodRating),
      ambiance_rating: toNumberOrNull(formState.ambianceRating),
      service_rating: toNumberOrNull(formState.serviceRating),
      value_rating: toNumberOrNull(formState.valueRating),
      total_price: toNumberOrNull(formState.totalPrice),
      currency: formState.currency.trim() || null,
      price_level: formState.priceLevel.trim() || null,
      dining_type: formState.diningType.trim() || null,
      would_return: formState.wouldReturn === "yes" ? true : formState.wouldReturn === "no" ? false : null,
      notes: formState.notes.trim() || null
    }

    setSaving(true)
    setMessage(null)
    try {
      if (editingEntry) {
        await updateEntry({ id: editingEntry.id, payload })
      } else {
        const created = await createEntry(payload as Partial<FoodEntry> & { name: string })
        if (queuedImages.length > 0) {
          for (const queued of queuedImages) {
            await addEntryImage({
              food_entry_id: created.id,
              storage_path: queued.storage_path,
              image_url: queued.image_url,
              is_primary: queued.is_primary,
              caption: queued.caption
            })
          }
        }
      }
      await refetch()
      closeFormModal()
      setMessage(editingEntry ? "Entry updated" : "Entry created")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save entry")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntry(id: string) {
    try {
      await deleteEntry(id)
      setMessage("Entry deleted")
      if (editingEntry?.id === id) closeFormModal()
      if (detailEntry?.id === id) setDetailsOpen(false)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to delete entry")
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Food Diary</Text>
          <TextInput
            style={[styles.input, themedInput(palette)]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search place, city, cuisine"
            placeholderTextColor={palette.textMuted}
          />

          <View style={styles.inlineRow}>
            <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={goToPreviousMonth}>
              <Text style={{ color: palette.text }}>Prev</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={goToToday}>
              <Text style={{ color: palette.text }}>Today</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={goToNextMonth}>
              <Text style={{ color: palette.text }}>Next</Text>
            </Pressable>
          </View>

          <Text style={[styles.monthTitle, { color: palette.text }]}>{formatMonthYear(currentYear, currentMonth)}</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={() => openCreate(selectedDate ?? undefined)}>
            <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add Entry</Text>
          </Pressable>

          {message ? <Text style={[styles.message, { color: palette.primary }]}>{message}</Text> : null}
          {isLoading ? <ActivityIndicator color={palette.primary} /> : null}
          {error instanceof Error ? <Text style={[styles.error, { color: palette.danger }]}>{error.message}</Text> : null}
        </View>

        <View style={[styles.calendar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.weekdayRow, { borderColor: palette.border }]}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={[styles.weekdayLabel, { color: palette.textMuted }]}>{weekday}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              const count = (entriesByDate[cell.date] ?? []).length
              const isSelected = selectedDate === cell.date
              return (
                <Pressable
                  key={cell.date}
                  style={[
                    styles.calendarCell,
                    { borderColor: palette.border },
                    !cell.isCurrentMonth && { backgroundColor: palette.surfaceMuted },
                    cell.isToday && { borderColor: palette.primary, borderWidth: 1 },
                    isSelected && { backgroundColor: palette.surfaceMuted }
                  ]}
                  onPress={() => setSelectedDate((prev) => (prev === cell.date ? null : cell.date))}
                >
                  <Text style={[styles.calendarDay, { color: cell.isCurrentMonth ? palette.text : palette.textMuted }]}>{cell.day}</Text>
                  {count > 0 ? (
                    <View style={[styles.countBadge, { backgroundColor: palette.primary }]}>
                      <Text style={[styles.countText, { color: palette.primaryText }]}>{count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: palette.text }]}>
            {selectedDate ? `Entries for ${selectedDate}` : `All Entries (${selectedEntries.length})`}
          </Text>
          {selectedDate ? (
            <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => openCreate(selectedDate)}>
              <Text style={{ color: palette.text }}>Add for Day</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedEntries.length === 0 ? (
          <Text style={[styles.empty, { color: palette.textMuted }]}>No entries in this view.</Text>
        ) : (
          selectedEntries.map((entry) => (
            <View key={entry.id} style={[styles.entryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.entryMain}>
                {entry.primary_image_url ? (
                  <Image source={{ uri: entry.primary_image_url }} style={styles.entryImage} />
                ) : (
                  <View style={[styles.entryImage, styles.entryImageFallback]}>
                    <Text style={[styles.entryImageFallbackText, { color: palette.textMuted }]}>No Photo</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryName, { color: palette.text }]}>{entry.branch ? `${entry.name} - ${entry.branch}` : entry.name}</Text>
                  <Text style={[styles.entryMeta, { color: palette.textMuted }]}>{formatVisitDate(entry.visit_date)} • {entry.city ?? "-"}</Text>
                  <Text style={[styles.entryMeta, { color: palette.textMuted }]}>Rating: {entry.overall_rating ?? "-"} • Total: ${foodTotal(entry).toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.inlineRow}>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => openDetails(entry)}>
                  <Text style={{ color: palette.text }}>Details</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => openDuplicate(entry)}>
                  <Text style={{ color: palette.text }}>Log Again</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => handleDeleteEntry(entry.id)}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalOpen && Boolean(formState)} animationType="slide" onRequestClose={closeFormModal}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>{editingEntry ? "Edit Entry" : "Add Entry"}</Text>
            <Pressable onPress={closeFormModal}>
              <Text style={{ color: palette.primary, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {(["general", "location", "items", "ratings", "notes"] as FormTab[]).map((tab) => (
              <Pressable
                key={tab}
                style={[
                  styles.tabButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: formTab === tab ? palette.primary : palette.surface
                  }
                ]}
                onPress={() => setFormTab(tab)}
              >
                <Text style={{ color: formTab === tab ? palette.primaryText : palette.text, fontSize: 12 }}>{tab}</Text>
              </Pressable>
            ))}
          </View>

          {formState ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              {formTab === "general" ? (
                <>
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.name} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, name: value } : prev))} placeholder="Place name" placeholderTextColor={palette.textMuted} />
                  {suggestions.length > 0 ? (
                    <View style={[styles.suggestions, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                      {suggestions.map((suggestion) => (
                        <Pressable key={`${suggestion.id}-suggest`} style={styles.suggestionRow} onPress={() => applySuggestion(suggestion)}>
                          <Text style={{ color: palette.text, fontWeight: "700" }}>{suggestion.branch ? `${suggestion.name} - ${suggestion.branch}` : suggestion.name}</Text>
                          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{suggestion.city ?? "-"} • {suggestion.category ?? "-"}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.branch} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, branch: value } : prev))} placeholder="Branch" placeholderTextColor={palette.textMuted} />
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.visitDate} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, visitDate: value } : prev))} placeholder="Visit date (YYYY-MM-DD)" placeholderTextColor={palette.textMuted} />
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.category} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, category: value } : prev))} placeholder="Category" placeholderTextColor={palette.textMuted} />
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.cuisineTypes} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, cuisineTypes: value } : prev))} placeholder="Cuisine types (comma-separated)" placeholderTextColor={palette.textMuted} />
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.tags} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, tags: value } : prev))} placeholder="Tags (comma-separated)" placeholderTextColor={palette.textMuted} />
                </>
              ) : null}

              {formTab === "location" ? (
                <>
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.googleMapsUrl} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, googleMapsUrl: value } : prev))} placeholder="Google Maps URL" placeholderTextColor={palette.textMuted} />
                  <Pressable style={[styles.secondaryButton, themedBorder(palette), autofilling && styles.disabled]} disabled={autofilling} onPress={autofillFromMaps}>
                    <Text style={{ color: palette.text }}>{autofilling ? "Autofilling..." : "Autofill From Map URL"}</Text>
                  </Pressable>
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.address} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, address: value } : prev))} placeholder="Address" placeholderTextColor={palette.textMuted} />
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.neighborhood} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, neighborhood: value } : prev))} placeholder="Neighborhood" placeholderTextColor={palette.textMuted} />
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.city} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, city: value } : prev))} placeholder="City" placeholderTextColor={palette.textMuted} />
                  </View>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.country} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, country: value } : prev))} placeholder="Country" placeholderTextColor={palette.textMuted} />
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.websiteUrl} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, websiteUrl: value } : prev))} placeholder="Website" placeholderTextColor={palette.textMuted} />
                  </View>
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.instagramHandle} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, instagramHandle: value } : prev))} placeholder="Instagram handle" placeholderTextColor={palette.textMuted} />
                </>
              ) : null}

              {formTab === "items" ? (
                <>
                  <TextInput
                    style={[styles.input, themedInput(palette), styles.itemsInput]}
                    value={formState.itemsText}
                    onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, itemsText: value } : prev))}
                    placeholder="Items ordered (one line each): name|price|category|imageUrl"
                    placeholderTextColor={palette.textMuted}
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={[styles.itemsEditor, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                    <View style={styles.itemsEditorHeader}>
                      <Text style={[styles.sectionLabel, { color: palette.text }]}>Item Editor</Text>
                      <Pressable style={[styles.itemActionButton, themedBorder(palette)]} onPress={addDraftItem}>
                        <Text style={{ color: palette.text, fontSize: 12 }}>Add Item</Text>
                      </Pressable>
                    </View>
                    {draftItems.length === 0 ? (
                      <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                        No parsed items yet. Add a row or keep using the multiline text input.
                      </Text>
                    ) : (
                      draftItems.map((item, index) => (
                        <View key={`draft-item-${index}`} style={[styles.itemEditorRow, { borderColor: palette.border }]}>
                          <TextInput
                            style={[styles.input, themedInput(palette), styles.itemEditorInput]}
                            value={item.name}
                            onChangeText={(value) => updateDraftItem(index, { name: value })}
                            placeholder="Item name"
                            placeholderTextColor={palette.textMuted}
                          />
                          <View style={styles.inlineRow}>
                            <TextInput
                              style={[styles.input, themedInput(palette), styles.halfInput]}
                              value={item.price != null ? String(item.price) : ""}
                              onChangeText={(value) => updateDraftItem(index, { price: toNumberOrNull(value) })}
                              placeholder="Price"
                              placeholderTextColor={palette.textMuted}
                              keyboardType="decimal-pad"
                            />
                            <TextInput
                              style={[styles.input, themedInput(palette), styles.halfInput]}
                              value={item.category ?? ""}
                              onChangeText={(value) => updateDraftItem(index, { category: value.trim() || null })}
                              placeholder="Category"
                              placeholderTextColor={palette.textMuted}
                            />
                          </View>
                          <TextInput
                            style={[styles.input, themedInput(palette)]}
                            value={item.image_url ?? ""}
                            onChangeText={(value) => updateDraftItem(index, { image_url: value.trim() || null })}
                            placeholder="Image URL"
                            placeholderTextColor={palette.textMuted}
                          />
                          {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.itemImagePreview} /> : null}
                          <View style={styles.inlineRow}>
                            <Pressable
                              style={[styles.itemActionButton, themedBorder(palette), uploading && styles.disabled]}
                              onPress={() => pickAndUploadItemImage(index)}
                              disabled={uploading}
                            >
                              <Text style={{ color: palette.text, fontSize: 12 }}>{uploading ? "Uploading..." : "Upload Item Image"}</Text>
                            </Pressable>
                            <Pressable style={[styles.itemActionButton, styles.itemDeleteButton]} onPress={() => removeDraftItem(index)}>
                              <Text style={styles.dangerButtonText}>Remove</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.favoriteItem} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, favoriteItem: value } : prev))} placeholder="Favorite item" placeholderTextColor={palette.textMuted} />
                  <Pressable style={[styles.secondaryButton, themedBorder(palette), (uploading || addingImage) && styles.disabled]} disabled={uploading || addingImage} onPress={pickAndUploadImage}>
                    <Text style={{ color: palette.text }}>{uploading || addingImage ? "Uploading..." : "Add Photo"}</Text>
                  </Pressable>
                </>
              ) : null}

              {formTab === "ratings" ? (
                <>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.overallRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, overallRating: value } : prev))} placeholder="Overall rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.foodRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, foodRating: value } : prev))} placeholder="Food rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.ambianceRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, ambianceRating: value } : prev))} placeholder="Ambiance rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.serviceRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, serviceRating: value } : prev))} placeholder="Service rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.valueRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, valueRating: value } : prev))} placeholder="Value rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.totalPrice} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, totalPrice: value } : prev))} placeholder="Total price" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.currency} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, currency: value } : prev))} placeholder="Currency" placeholderTextColor={palette.textMuted} />
                    <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.priceLevel} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, priceLevel: value } : prev))} placeholder="Price level" placeholderTextColor={palette.textMuted} />
                  </View>
                  <TextInput style={[styles.input, themedInput(palette)]} value={formState.diningType} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, diningType: value } : prev))} placeholder="Dining type" placeholderTextColor={palette.textMuted} />
                  <View style={styles.inlineRow}>
                    <Pressable style={[styles.secondaryButton, themedBorder(palette), formState.wouldReturn === "yes" && { backgroundColor: palette.primary }]} onPress={() => setFormState((prev) => (prev ? { ...prev, wouldReturn: "yes" } : prev))}>
                      <Text style={{ color: formState.wouldReturn === "yes" ? palette.primaryText : palette.text }}>Would Return: Yes</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryButton, themedBorder(palette), formState.wouldReturn === "no" && { backgroundColor: palette.primary }]} onPress={() => setFormState((prev) => (prev ? { ...prev, wouldReturn: "no" } : prev))}>
                      <Text style={{ color: formState.wouldReturn === "no" ? palette.primaryText : palette.text }}>Would Return: No</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {formTab === "notes" ? (
                <TextInput
                  style={[styles.input, themedInput(palette), styles.notesInput]}
                  value={formState.notes}
                  onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, notes: value } : prev))}
                  placeholder="Notes"
                  placeholderTextColor={palette.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              ) : null}

              {editingEntry && entryImages.length > 0 ? (
                <View style={[styles.imagesBlock, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Text style={[styles.sectionLabel, { color: palette.text }]}>Saved Photos</Text>
                  {entryImages.map((imageItem) => (
                    <View key={imageItem.id} style={[styles.imageRow, { borderColor: palette.border }]}>
                      <Image source={{ uri: imageItem.image_url }} style={styles.imageThumb} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{imageItem.is_primary ? "Primary" : "Secondary"}</Text>
                        <View style={styles.inlineRow}>
                          {!imageItem.is_primary ? (
                            <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => handleMakePrimary(imageItem)}>
                              <Text style={{ color: palette.text }}>Make Primary</Text>
                            </Pressable>
                          ) : null}
                          <Pressable style={styles.dangerButton} onPress={() => handleDeleteImage(imageItem)}>
                            <Text style={styles.dangerButtonText}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {!editingEntry && queuedImages.length > 0 ? (
                <View style={[styles.imagesBlock, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Text style={[styles.sectionLabel, { color: palette.text }]}>Queued Photos</Text>
                  {queuedImages.map((imageItem) => (
                    <View key={imageItem.id} style={[styles.imageRow, { borderColor: palette.border }]}>
                      <Image source={{ uri: imageItem.image_url }} style={styles.imageThumb} />
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{imageItem.is_primary ? "Primary on save" : "Secondary"}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }, (saving || updating) && styles.disabled]} disabled={saving || updating} onPress={saveEntry}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>{saving || updating ? "Saving..." : "Save Entry"}</Text>
              </Pressable>
              {editingEntry ? (
                <Pressable style={styles.dangerButton} onPress={() => handleDeleteEntry(editingEntry.id)}>
                  <Text style={styles.dangerButtonText}>Delete Entry</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

      <Modal visible={detailsOpen && Boolean(detailEntry)} animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>{detailEntry?.branch ? `${detailEntry.name} - ${detailEntry.branch}` : detailEntry?.name}</Text>
            <Pressable onPress={() => setDetailsOpen(false)}>
              <Text style={{ color: palette.primary, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {(["overview", "details", "notes"] as DetailTab[]).map((tab) => (
              <Pressable
                key={tab}
                style={[
                  styles.tabButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: detailTab === tab ? palette.primary : palette.surface
                  }
                ]}
                onPress={() => setDetailTab(tab)}
              >
                <Text style={{ color: detailTab === tab ? palette.primaryText : palette.text, fontSize: 12 }}>{tab}</Text>
              </Pressable>
            ))}
          </View>

          {detailEntry ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              {(detailImages.length > 0 || detailEntry.primary_image_url) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(detailImages.length > 0 ? detailImages.map((img) => img.image_url) : [detailEntry.primary_image_url as string]).map((url, index) => (
                    <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.detailImage} />
                  ))}
                </ScrollView>
              )}

              {detailTab === "overview" ? (
                <View style={[styles.infoSection, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Text style={[styles.sectionLabel, { color: palette.text }]}>Overview</Text>
                  <Text style={{ color: palette.textMuted }}>Visit: {formatVisitDate(detailEntry.visit_date)}</Text>
                  <Text style={{ color: palette.textMuted }}>Category: {detailEntry.category ?? "-"}</Text>
                  <Text style={{ color: palette.textMuted }}>Cuisine: {(detailEntry.cuisine_type ?? []).join(", ") || "-"}</Text>
                  <Text style={{ color: palette.textMuted }}>Rating: {detailEntry.overall_rating ?? "-"}</Text>
                  <Text style={{ color: palette.textMuted }}>Total: ${foodTotal(detailEntry).toFixed(2)}</Text>
                  <Text style={{ color: palette.textMuted }}>Would Return: {detailEntry.would_return == null ? "-" : detailEntry.would_return ? "Yes" : "No"}</Text>
                </View>
              ) : null}

              {detailTab === "details" ? (
                <View style={[styles.infoSection, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Text style={[styles.sectionLabel, { color: palette.text }]}>Location & Items</Text>
                  <Text style={{ color: palette.textMuted }}>{detailEntry.address ?? "-"}</Text>
                  <Text style={{ color: palette.textMuted }}>{[detailEntry.neighborhood, detailEntry.city, detailEntry.country].filter(Boolean).join(", ") || "-"}</Text>
                  <View style={styles.inlineRow}>
                    {detailEntry.google_maps_url ? (
                      <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => Linking.openURL(detailEntry.google_maps_url as string)}>
                        <Text style={{ color: palette.text }}>Open Maps</Text>
                      </Pressable>
                    ) : null}
                    {detailEntry.website_url ? (
                      <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => Linking.openURL(detailEntry.website_url as string)}>
                        <Text style={{ color: palette.text }}>Open Website</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.inlineRow}>
                    <Pressable
                      style={[styles.secondaryButton, themedBorder(palette)]}
                      onPress={() => copyToClipboard(detailEntry.address, "Address")}
                    >
                      <Text style={{ color: palette.text }}>Copy Address</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryButton, themedBorder(palette)]}
                      onPress={() => copyToClipboard(detailEntry.google_maps_url, "Maps URL")}
                    >
                      <Text style={{ color: palette.text }}>Copy Maps URL</Text>
                    </Pressable>
                  </View>
                  {(detailEntry.items_ordered ?? []).map((item, index) => (
                    <View key={`${item.name}-${index}`} style={[styles.itemRow, { borderColor: palette.border }]}>
                      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.itemDetailThumb} /> : null}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.text }}>{item.name}</Text>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                          Category: {(item.categories?.length ? item.categories.join(", ") : item.category) ?? "-"}
                        </Text>
                      </View>
                      <Text style={{ color: palette.textMuted }}>${item.price ?? 0}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {detailTab === "notes" ? (
                <View style={[styles.infoSection, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Text style={[styles.sectionLabel, { color: palette.text }]}>Notes</Text>
                  <Text style={{ color: palette.textMuted }}>{detailEntry.notes || "No notes added."}</Text>
                </View>
              ) : null}

              <View style={styles.inlineRow}>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => openDuplicate(detailEntry)}>
                  <Text style={{ color: palette.text }}>Log Again</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => openEdit(detailEntry)}>
                  <Text style={{ color: palette.text }}>Edit</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => handleDeleteEntry(detailEntry.id)}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function themedInput(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    color: palette.text
  }
}

function themedBorder(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return {
    borderColor: palette.border,
    backgroundColor: palette.surface
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  header: { gap: 10 },
  title: { fontSize: 24, fontWeight: "700" },
  monthTitle: { fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inlineRow: { flexDirection: "row", gap: 8 },
  halfInput: { flex: 1 },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: { fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  disabled: { opacity: 0.6 },
  message: { fontSize: 12 },
  error: { fontSize: 12 },
  calendar: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden"
  },
  weekdayRow: { flexDirection: "row", borderBottomWidth: 1 },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: "700"
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: "14.2857%",
    minHeight: 58,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 4,
    justifyContent: "space-between"
  },
  calendarDay: { fontSize: 12, fontWeight: "600" },
  countBadge: { alignSelf: "flex-end", minWidth: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: "center" },
  countText: { fontSize: 10, fontWeight: "700" },
  resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  resultsTitle: { fontSize: 15, fontWeight: "700" },
  empty: { fontSize: 13 },
  entryCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  entryMain: { flexDirection: "row", gap: 10 },
  entryImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#e2e8f0" },
  entryImageFallback: { alignItems: "center", justifyContent: "center" },
  entryImageFallbackText: { fontSize: 10, fontWeight: "600" },
  entryName: { fontSize: 16, fontWeight: "700" },
  entryMeta: { fontSize: 12, marginTop: 2 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0"
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { padding: 16, gap: 10, paddingBottom: 30 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  tabButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  suggestions: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  suggestionRow: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 5, gap: 2 },
  itemsInput: { minHeight: 110 },
  itemsEditor: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 8 },
  itemsEditorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemEditorRow: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 8 },
  itemEditorInput: { marginBottom: 0 },
  itemActionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center"
  },
  itemDeleteButton: {
    backgroundColor: "#b91c1c",
    borderColor: "#b91c1c"
  },
  itemImagePreview: { width: "100%", height: 120, borderRadius: 8, backgroundColor: "#e2e8f0" },
  notesInput: { minHeight: 120 },
  imagesBlock: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700" },
  imageRow: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: "center" },
  imageThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#e2e8f0" },
  detailImage: { width: 220, height: 150, borderRadius: 10, backgroundColor: "#e2e8f0" },
  infoSection: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  itemRow: { borderWidth: 1, borderRadius: 8, padding: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  itemDetailThumb: { width: 42, height: 42, borderRadius: 8, backgroundColor: "#e2e8f0" }
})
