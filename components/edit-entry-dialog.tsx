"use client"

import { useState, useEffect } from "react"
import { MediaEntry } from "@/lib/database.types"
import { updateEntry, getUniqueFieldValues, CreateEntryInput } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Upload, Download } from "lucide-react"
import { toast } from "sonner"
import { SafeImage } from "@/components/ui/safe-image"
import { differenceInDays, parseISO, isValid } from "date-fns"

interface EditEntryDialogProps {
  entry: MediaEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (updatedEntry: MediaEntry) => void
}

export function EditEntryDialog({ entry, open, onOpenChange, onSuccess }: EditEntryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [fetchingSource, setFetchingSource] = useState<"omdb" | "tmdb" | null>(null)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [pendingMetadata, setPendingMetadata] = useState<any>(null)
  const [overrideFields, setOverrideFields] = useState<Record<string, boolean>>({
    title: true,
    poster_url: true,
    genre: true,
    language: true,
    average_rating: true,
    length: true,
    episodes: true,
    imdb_id: true,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dropdownOptions, setDropdownOptions] = useState<{
    types: string[]
    statuses: string[]
    mediums: string[]
    platforms: string[]
  }>({
    types: [],
    statuses: [],
    mediums: [],
    platforms: [],
  })
  const [showNewInput, setShowNewInput] = useState<{
    type: boolean
    status: boolean
    medium: boolean
    platform: boolean
  }>({
    type: false,
    status: false,
    medium: false,
    platform: false,
  })
  const [newValue, setNewValue] = useState<{
    type: string
    status: string
    medium: string
    platform: string
  }>({
    type: "",
    status: "",
    medium: "",
    platform: "",
  })
  const [formData, setFormData] = useState<Partial<CreateEntryInput>>({
    title: "",
    medium: null,
    type: null,
    season: null,
    episodes: null,
    length: null,
    price: null,
    language: null,
    platform: null,
    status: null,
    genre: null,
    my_rating: null,
    average_rating: null,
    rating: null,
    start_date: null,
    finish_date: null,
    time_taken: null,
    poster_url: null,
    imdb_id: null,
  })
  const [genreInput, setGenreInput] = useState("")
  const [languageInput, setLanguageInput] = useState("")

  // Fetch dropdown options
  useEffect(() => {
    async function fetchOptions() {
      const result = await getUniqueFieldValues()
      if (result.success && result.data) {
        setDropdownOptions(result.data)
      }
    }
    fetchOptions()
  }, [])

  // Load entry data when dialog opens
  useEffect(() => {
    if (open && entry) {
      const genreArray = Array.isArray(entry.genre) ? entry.genre : entry.genre ? [entry.genre] : null
      const languageArray = (() => {
        const lang = entry.language as string[] | string | null | undefined;
        if (!lang) return null;
        if (Array.isArray(lang)) return lang;
        if (typeof lang === 'string') {
          try {
            const parsed = JSON.parse(lang);
            if (Array.isArray(parsed)) {
              return parsed.filter((l: any) => l && typeof l === 'string').map((l: string) => l.trim()).filter(Boolean);
            }
          } catch {
            // Not JSON, continue with comma-separated parsing
          }
          return lang.split(",").map((l: string) => l.trim()).filter(Boolean);
        }
        return null;
      })()

      setFormData({
        title: entry.title || "",
        medium: entry.medium || null,
        type: entry.type || null,
        season: entry.season || null,
        episodes: entry.episodes || null,
        length: entry.length || null,
        price: entry.price || null,
        language: languageArray,
        platform: entry.platform || null,
        status: entry.status || null,
        genre: genreArray,
        my_rating: entry.my_rating || null,
        average_rating: entry.average_rating || null,
        rating: entry.rating || null,
        start_date: entry.start_date || null,
        finish_date: entry.finish_date || null,
        time_taken: entry.time_taken || null,
        poster_url: entry.poster_url || null,
        imdb_id: entry.imdb_id || null,
      })
      setGenreInput(genreArray ? genreArray.join(", ") : "")
      setLanguageInput(languageArray ? languageArray.join(", ") : "")
    }
  }, [open, entry])

  // Auto-calculate time_taken when start_date or finish_date changes
  useEffect(() => {
    if (formData.start_date && formData.finish_date) {
      try {
        const start = parseISO(formData.start_date)
        const finish = parseISO(formData.finish_date)
        if (isValid(start) && isValid(finish)) {
          const days = differenceInDays(finish, start)
          if (days >= 0) {
            const totalDays = days + 1
            const calculatedTimeTaken = totalDays === 1 ? "1 day" : `${totalDays} days`
            setFormData((prev) => ({ ...prev, time_taken: calculatedTimeTaken }))
          }
        }
      } catch (error) {
        // Invalid date format, ignore
      }
    } else {
      setFormData((prev) => ({ ...prev, time_taken: null }))
    }
  }, [formData.start_date, formData.finish_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || formData.title.trim() === "") {
      toast.error("Title is required")
      return
    }

    if (!entry) return

    setLoading(true)

    try {
      const entryData: CreateEntryInput = {
        title: formData.title.trim(),
        medium: formData.medium || null,
        type: formData.type || null,
        season: formData.season?.trim() || null,
        episodes: formData.episodes || null,
        length: formData.length?.trim() || null,
        price: formData.price || null,
        language: formData.language && formData.language.length > 0 ? formData.language : null,
        platform: formData.platform?.trim() || null,
        status: formData.status || null,
        genre: formData.genre && formData.genre.length > 0 ? formData.genre : null,
        my_rating: formData.my_rating || null,
        average_rating: formData.average_rating || null,
        rating: formData.rating || null,
        start_date: formData.start_date || null,
        finish_date: formData.finish_date || null,
        time_taken: formData.time_taken?.trim() || null,
        poster_url: formData.poster_url?.trim() || null,
        imdb_id: formData.imdb_id?.trim() || null,
      }

      const result = await updateEntry(entry.id, entryData)
      if (result.success && result.data) {
        toast.success("Entry updated successfully")
        // Call onSuccess before closing to ensure state is updated
        onSuccess?.(result.data)
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to update entry")
      }
    } catch (error) {
      console.error("Error saving entry:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGenreChange = (value: string) => {
    setGenreInput(value)
    const genres = value
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
    setFormData({ ...formData, genre: genres.length > 0 ? genres : null })
  }

  const handleLanguageChange = (value: string) => {
    setLanguageInput(value)
    const languages = value
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    setFormData({ ...formData, language: languages.length > 0 ? languages : null })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploadingImage(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      // Pass title if available for naming the file
      if (formData.title && formData.title.trim()) {
        uploadFormData.append('title', formData.title.trim())
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, poster_url: data.url }))
        toast.success('Image uploaded successfully')
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      // Reset file input
      e.target.value = ''
    }
  }

  // Helper functions for detecting ISBN and IMDb ID
  const detectISBN = (input: string | null | undefined): string | null => {
    if (!input) return null
    const cleaned = input.replace(/[^0-9X]/g, '')
    if (/^(978|979)\d{10}$/.test(cleaned)) {
      return cleaned
    }
    if (/^\d{9}[\dX]$/.test(cleaned)) {
      return cleaned
    }
    return null
  }

  const detectIMDbID = (input: string | null | undefined): boolean => {
    if (!input) return false
    const trimmed = input.trim()
    return /^tt\d{7,8}$/i.test(trimmed)
  }

  const handleFetchMetadata = async (source: "omdb" | "tmdb") => {
    const isbn = detectISBN(formData.imdb_id)
    const isImdbId = detectIMDbID(formData.imdb_id)
    const hasTitle = formData.title?.trim()
    
    if (!hasTitle && !isbn && !isImdbId) {
      toast.error("Please enter a title, ISBN, or IMDb ID first")
      return
    }

    setFetchingMetadata(true)
    setFetchingSource(source)
    try {
      let url = ""
      
      if (isbn || isImdbId) {
        url = `/api/metadata?imdb_id=${encodeURIComponent(formData.imdb_id!.trim())}&source=${source}`
        if (hasTitle && formData.title) {
          url += `&title=${encodeURIComponent(formData.title.trim())}`
        }
      } else {
        url = `/api/metadata?title=${encodeURIComponent((formData.title || "").trim())}&source=${source}`
      }
      
      if (formData.medium) {
        if (formData.medium === "Book") {
          url += `&medium=${encodeURIComponent(formData.medium)}`
        } else {
          const typeMap: Record<string, string> = {
            "Movie": "movie",
            "TV Show": "series",
          }
          const omdbType = typeMap[formData.medium]
          if (omdbType) {
            url += `&type=${omdbType}`
          }
        }
      } else if (isbn) {
        url += `&medium=Book`
      }
      
      if (formData.season) {
        url += `&season=${encodeURIComponent(formData.season)}`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch metadata")
      }

      const metadata = await response.json()

      // Check if there's existing data that would be overwritten
      const hasExistingData = 
        formData.title ||
        formData.poster_url ||
        formData.genre ||
        formData.language ||
        formData.average_rating !== null ||
        formData.length ||
        formData.episodes !== null ||
        formData.imdb_id

      if (hasExistingData) {
        // Show confirmation dialog with field selection
        setPendingMetadata(metadata)
        // Initialize override fields based on what data exists and what's available in metadata
        // Show field if metadata has it AND (form has it OR we want to allow adding new data)
        const hasGenre = formData.genre && (Array.isArray(formData.genre) ? formData.genre.length > 0 : true)
        const hasLanguage = formData.language && (Array.isArray(formData.language) ? formData.language.length > 0 : true)
        setOverrideFields({
          title: !!metadata.title && !!formData.title,
          poster_url: !!metadata.poster_url && !!formData.poster_url,
          genre: !!metadata.genre && !!hasGenre,
          language: !!metadata.language && !!hasLanguage,
          average_rating: metadata.average_rating !== null && formData.average_rating !== null,
          length: !!metadata.length,
          episodes: metadata.episodes !== null && formData.episodes !== null,
          imdb_id: !!metadata.imdb_id && !!formData.imdb_id,
        })
        setShowOverrideDialog(true)
        setFetchingMetadata(false)
        setFetchingSource(null)
        return
      }

      // No existing data, apply directly
      applyMetadata(metadata)
      toast.success(`Metadata fetched successfully from ${source.toUpperCase()}`)
    } catch (error) {
      console.error("Error fetching metadata:", error)
      toast.error(error instanceof Error ? error.message : "Failed to fetch metadata")
    } finally {
      setFetchingMetadata(false)
      setFetchingSource(null)
    }
  }

  const applyMetadata = (metadata: any, fieldsToOverride?: Record<string, boolean>) => {
    const fetchedGenres = metadata.genre 
      ? (Array.isArray(metadata.genre) 
          ? metadata.genre.map((g: string) => g.trim()).filter(Boolean)
          : metadata.genre.split(",").map((g: string) => g.trim()).filter(Boolean))
      : []
    const fetchedLanguages = metadata.language 
      ? (Array.isArray(metadata.language)
          ? metadata.language.map((l: string) => l.trim()).filter(Boolean)
          : metadata.language.split(",").map((l: string) => l.trim()).filter(Boolean))
      : []
    
    setFormData((prev) => {
      // Handle genres - merge if not overriding, replace if overriding
      let finalGenres: string[] = []
      if (fieldsToOverride?.genre && fetchedGenres.length > 0) {
        // Override: use fetched genres
        finalGenres = fetchedGenres
      } else if (fieldsToOverride?.genre === false) {
        // Don't override: keep existing
        finalGenres = prev.genre && Array.isArray(prev.genre) ? prev.genre : []
      } else {
        // Merge (default behavior when no override specified)
        const existingGenres = prev.genre && Array.isArray(prev.genre) ? prev.genre : []
        const mergedGenres = [...existingGenres]
        fetchedGenres.forEach((g: string) => {
          const normalized = g.toLowerCase()
          if (!mergedGenres.some((eg: string) => eg.toLowerCase() === normalized)) {
            mergedGenres.push(g)
          }
        })
        finalGenres = mergedGenres
      }
      
      // Handle languages - merge if not overriding, replace if overriding
      let finalLanguages: string[] = []
      if (fieldsToOverride?.language && fetchedLanguages.length > 0) {
        // Override: use fetched languages
        finalLanguages = fetchedLanguages
      } else if (fieldsToOverride?.language === false) {
        // Don't override: keep existing
        finalLanguages = prev.language && Array.isArray(prev.language) ? prev.language : []
      } else {
        // Merge (default behavior when no override specified)
        const existingLanguages = prev.language && Array.isArray(prev.language) ? prev.language : []
        const mergedLanguages = [...existingLanguages]
        fetchedLanguages.forEach((l: string) => {
          const normalized = l.toLowerCase()
          if (!mergedLanguages.some((el: string) => el.toLowerCase() === normalized)) {
            mergedLanguages.push(l)
          }
        })
        finalLanguages = mergedLanguages
      }
      
      const genreText = finalGenres.length > 0 ? finalGenres.join(", ") : ""
      const languageText = finalLanguages.length > 0 ? finalLanguages.join(", ") : ""
      setGenreInput(genreText)
      setLanguageInput(languageText)
      
      return {
        ...prev,
        title: (fieldsToOverride?.title && metadata.title) ? metadata.title : prev.title,
        poster_url: (fieldsToOverride?.poster_url && metadata.poster_url) ? metadata.poster_url : prev.poster_url,
        genre: finalGenres.length > 0 ? finalGenres : null,
        language: finalLanguages.length > 0 ? finalLanguages : null,
        average_rating: (fieldsToOverride?.average_rating && metadata.average_rating !== null) ? metadata.average_rating : prev.average_rating,
        length: (fieldsToOverride?.length && metadata.length) ? metadata.length : prev.length,
        episodes: (fieldsToOverride?.episodes && metadata.episodes !== null) ? metadata.episodes : prev.episodes,
        imdb_id: (fieldsToOverride?.imdb_id && metadata.imdb_id) ? metadata.imdb_id : prev.imdb_id,
      }
    })
  }

  const handleConfirmOverride = () => {
    if (pendingMetadata) {
      applyMetadata(pendingMetadata, overrideFields)
      toast.success(`Metadata fetched successfully from ${fetchingSource?.toUpperCase() || "API"}`)
    }
    setShowOverrideDialog(false)
    setPendingMetadata(null)
  }

  const handleCancelOverride = () => {
    setShowOverrideDialog(false)
    setPendingMetadata(null)
  }

  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogDescription>
            Update the entry details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-6 pb-4">
            {/* Title - Required */}
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-mono">
                Title <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-title"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                  required
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFetchMetadata("omdb")}
                    disabled={fetchingMetadata || (!formData.title?.trim() && !detectISBN(formData.imdb_id) && !detectIMDbID(formData.imdb_id))}
                  >
                    {fetchingMetadata && fetchingSource === "omdb" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        OMDB
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFetchMetadata("tmdb")}
                    disabled={fetchingMetadata || (!formData.title?.trim() && !detectISBN(formData.imdb_id) && !detectIMDbID(formData.imdb_id))}
                  >
                    {fetchingMetadata && fetchingSource === "tmdb" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        TMDB
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Medium and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-medium" className="text-sm font-mono">
                  Medium
                </Label>
                {showNewInput.medium ? (
                  <div className="flex gap-2">
                    <Input
                      id="edit-medium"
                      value={newValue.medium}
                      onChange={(e) => setNewValue({ ...newValue, medium: e.target.value })}
                      placeholder="Enter new medium"
                      onBlur={() => {
                        if (newValue.medium.trim()) {
                          const trimmedValue = newValue.medium.trim()
                          setFormData({ ...formData, medium: trimmedValue })
                          setDropdownOptions((prev: typeof dropdownOptions) => ({
                            ...prev,
                            mediums: prev.mediums.includes(trimmedValue) ? prev.mediums : [...prev.mediums, trimmedValue]
                          }))
                          setShowNewInput({ ...showNewInput, medium: false })
                          setNewValue({ ...newValue, medium: "" })
                        } else {
                          setShowNewInput({ ...showNewInput, medium: false })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <Select
                    value={formData.medium || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__new__") {
                        setShowNewInput({ ...showNewInput, medium: true })
                      } else {
                        setFormData({ ...formData, medium: value === "__none__" ? null : value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {dropdownOptions.mediums.map((medium) => (
                        <SelectItem key={medium} value={medium}>
                          {medium}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-mono">
                  Status
                </Label>
                {showNewInput.status ? (
                  <div className="flex gap-2">
                    <Input
                      id="edit-status"
                      value={newValue.status}
                      onChange={(e) => setNewValue({ ...newValue, status: e.target.value })}
                      placeholder="Enter new status"
                      onBlur={() => {
                        if (newValue.status.trim()) {
                          const trimmedValue = newValue.status.trim()
                          setFormData({ ...formData, status: trimmedValue })
                          setDropdownOptions((prev: typeof dropdownOptions) => ({
                            ...prev,
                            statuses: prev.statuses.includes(trimmedValue) ? prev.statuses : [...prev.statuses, trimmedValue]
                          }))
                          setShowNewInput({ ...showNewInput, status: false })
                          setNewValue({ ...newValue, status: "" })
                        } else {
                          setShowNewInput({ ...showNewInput, status: false })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <Select
                    value={formData.status || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__new__") {
                        setShowNewInput({ ...showNewInput, status: true })
                      } else {
                        setFormData({ ...formData, status: value === "__none__" ? null : value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {dropdownOptions.statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Type, Season, Language */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-sm font-mono">
                  Type
                </Label>
                {showNewInput.type ? (
                  <div className="flex gap-2">
                    <Input
                      id="edit-type"
                      value={newValue.type}
                      onChange={(e) => setNewValue({ ...newValue, type: e.target.value })}
                      placeholder="Enter new type"
                      onBlur={() => {
                        if (newValue.type.trim()) {
                          const trimmedValue = newValue.type.trim()
                          setFormData({ ...formData, type: trimmedValue })
                          setDropdownOptions((prev: typeof dropdownOptions) => ({
                            ...prev,
                            types: prev.types.includes(trimmedValue) ? prev.types : [...prev.types, trimmedValue]
                          }))
                          setShowNewInput({ ...showNewInput, type: false })
                          setNewValue({ ...newValue, type: "" })
                        } else {
                          setShowNewInput({ ...showNewInput, type: false })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <Select
                    value={formData.type || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__new__") {
                        setShowNewInput({ ...showNewInput, type: true })
                      } else {
                        setFormData({ ...formData, type: value === "__none__" ? null : value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {dropdownOptions.types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-season" className="text-sm font-mono">
                  Season
                </Label>
                <Input
                  id="edit-season"
                  value={formData.season || ""}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  placeholder="Enter season"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-language" className="text-sm font-mono">
                  Language
                </Label>
                <Input
                  id="edit-language"
                  value={languageInput}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  placeholder="Comma-separated languages"
                />
              </div>
            </div>

            {/* Episodes, Length, Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-episodes" className="text-sm font-mono">
                  Episodes
                </Label>
                <Input
                  id="edit-episodes"
                  type="number"
                  value={formData.episodes || ""}
                  onChange={(e) => setFormData({ ...formData, episodes: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Number of episodes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-length" className="text-sm font-mono">
                  Length
                </Label>
                <Input
                  id="edit-length"
                  value={formData.length || ""}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  placeholder="e.g., 120 min"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-sm font-mono">
                  Price
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Price"
                />
              </div>
            </div>

            {/* Platform, Genre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-platform" className="text-sm font-mono">
                  Platform
                </Label>
                {showNewInput.platform ? (
                  <div className="flex gap-2">
                    <Input
                      id="edit-platform"
                      value={newValue.platform}
                      onChange={(e) => setNewValue({ ...newValue, platform: e.target.value })}
                      placeholder="Enter new platform"
                      onBlur={() => {
                        if (newValue.platform.trim()) {
                          const trimmedValue = newValue.platform.trim()
                          setFormData({ ...formData, platform: trimmedValue })
                          setDropdownOptions((prev: typeof dropdownOptions) => ({
                            ...prev,
                            platforms: prev.platforms.includes(trimmedValue) ? prev.platforms : [...prev.platforms, trimmedValue]
                          }))
                          setShowNewInput({ ...showNewInput, platform: false })
                          setNewValue({ ...newValue, platform: "" })
                        } else {
                          setShowNewInput({ ...showNewInput, platform: false })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <Select
                    value={formData.platform || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__new__") {
                        setShowNewInput({ ...showNewInput, platform: true })
                      } else {
                        setFormData({ ...formData, platform: value === "__none__" ? null : value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {dropdownOptions.platforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-genre" className="text-sm font-mono">
                  Genre
                </Label>
                <Input
                  id="edit-genre"
                  value={genreInput}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  placeholder="Comma-separated genres"
                />
              </div>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-my-rating" className="text-sm font-mono">
                  My Rating
                </Label>
                <Input
                  id="edit-my-rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.my_rating || ""}
                  onChange={(e) => setFormData({ ...formData, my_rating: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-average-rating" className="text-sm font-mono">
                  Average Rating
                </Label>
                <Input
                  id="edit-average-rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.average_rating || ""}
                  onChange={(e) => setFormData({ ...formData, average_rating: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0-10"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date" className="text-sm font-mono">
                  Start Date
                </Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-finish-date" className="text-sm font-mono">
                  Finish Date
                </Label>
                <Input
                  id="edit-finish-date"
                  type="date"
                  value={formData.finish_date || ""}
                  onChange={(e) => setFormData({ ...formData, finish_date: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-time-taken" className="text-sm font-mono">
                  Time Taken
                </Label>
                <Input
                  id="edit-time-taken"
                  value={formData.time_taken || ""}
                  onChange={(e) => setFormData({ ...formData, time_taken: e.target.value })}
                  placeholder="Auto-calculated from dates"
                />
              </div>
            </div>

            {/* Poster URL and IMDb ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-poster-url" className="text-sm font-mono">
                  Poster URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-poster-url"
                    type="url"
                    value={formData.poster_url || ""}
                    onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <input
                    type="file"
                    id="edit-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('edit-image-upload')?.click()}
                    disabled={uploadingImage}
                    className="gap-2"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
                {formData.poster_url && (
                  <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted">
                    <SafeImage
                      src={formData.poster_url}
                      alt="Poster preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-imdb-id" className="text-sm font-mono">
                  IMDb ID
                </Label>
                <Input
                  id="edit-imdb-id"
                  value={formData.imdb_id || ""}
                  onChange={(e) => setFormData({ ...formData, imdb_id: e.target.value })}
                  placeholder="tt1234567"
                />
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Override Confirmation Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Select Fields to Override</DialogTitle>
            <DialogDescription>
              Choose which metadata fields you want to override with the fetched data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 flex-1 overflow-y-auto min-h-0">
            {pendingMetadata && (
              <div className="space-y-2">
                {pendingMetadata.title && formData.title && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-title"
                      checked={overrideFields.title}
                      onChange={(e) => setOverrideFields({ ...overrideFields, title: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-title" className="text-sm font-medium cursor-pointer block mb-1">
                        Title
                      </label>
                      <div className="text-xs text-muted-foreground break-words">
                        {pendingMetadata.title}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.poster_url && formData.poster_url && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-poster"
                      checked={overrideFields.poster_url}
                      onChange={(e) => setOverrideFields({ ...overrideFields, poster_url: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-poster" className="text-sm font-medium cursor-pointer block mb-1">
                        Poster URL
                      </label>
                      <div className="text-xs text-muted-foreground break-all">
                        {pendingMetadata.poster_url}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.genre && formData.genre && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-genre"
                      checked={overrideFields.genre}
                      onChange={(e) => setOverrideFields({ ...overrideFields, genre: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-genre" className="text-sm font-medium cursor-pointer block mb-1">
                        Genre
                      </label>
                      <div className="text-xs text-muted-foreground break-words">
                        {Array.isArray(pendingMetadata.genre) 
                          ? pendingMetadata.genre.join(", ")
                          : pendingMetadata.genre}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.language && formData.language && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-language"
                      checked={overrideFields.language}
                      onChange={(e) => setOverrideFields({ ...overrideFields, language: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-language" className="text-sm font-medium cursor-pointer block mb-1">
                        Language
                      </label>
                      <div className="text-xs text-muted-foreground break-words">
                        {Array.isArray(pendingMetadata.language)
                          ? pendingMetadata.language.join(", ")
                          : pendingMetadata.language}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.average_rating !== null && formData.average_rating !== null && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-rating"
                      checked={overrideFields.average_rating}
                      onChange={(e) => setOverrideFields({ ...overrideFields, average_rating: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-rating" className="text-sm font-medium cursor-pointer block mb-1">
                        Average Rating
                      </label>
                      <div className="text-xs text-muted-foreground">
                        {pendingMetadata.average_rating}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.length && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-length"
                      checked={overrideFields.length}
                      onChange={(e) => setOverrideFields({ ...overrideFields, length: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-length" className="text-sm font-medium cursor-pointer block mb-1">
                        Length
                      </label>
                      <div className="text-xs text-muted-foreground break-words">
                        {pendingMetadata.length}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.episodes !== null && formData.episodes !== null && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-episodes"
                      checked={overrideFields.episodes}
                      onChange={(e) => setOverrideFields({ ...overrideFields, episodes: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-episodes" className="text-sm font-medium cursor-pointer block mb-1">
                        Episodes
                      </label>
                      <div className="text-xs text-muted-foreground">
                        {pendingMetadata.episodes}
                      </div>
                    </div>
                  </div>
                )}
                {pendingMetadata.imdb_id && formData.imdb_id && (
                  <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id="override-imdb"
                      checked={overrideFields.imdb_id}
                      onChange={(e) => setOverrideFields({ ...overrideFields, imdb_id: e.target.checked })}
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="override-imdb" className="text-sm font-medium cursor-pointer block mb-1">
                        IMDb ID
                      </label>
                      <div className="text-xs text-muted-foreground break-all">
                        {pendingMetadata.imdb_id}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Select all
                  setOverrideFields({
                    title: true,
                    poster_url: true,
                    genre: true,
                    language: true,
                    average_rating: true,
                    length: true,
                    episodes: true,
                    imdb_id: true,
                  })
                }}
                className="flex-1 sm:flex-initial"
              >
                Select All
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Deselect all
                  setOverrideFields({
                    title: false,
                    poster_url: false,
                    genre: false,
                    language: false,
                    average_rating: false,
                    length: false,
                    episodes: false,
                    imdb_id: false,
                  })
                }}
                className="flex-1 sm:flex-initial"
              >
                Deselect All
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={handleCancelOverride} className="flex-1 sm:flex-initial">
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleConfirmOverride}
                disabled={!Object.values(overrideFields).some(v => v)}
                className="flex-1 sm:flex-initial"
              >
                Apply Selected
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

