"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MediaEntry } from "@/lib/database.types"
import { createEntry, updateEntry, CreateEntryInput, getUniqueFieldValues, getEntry } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ArrowLeft, Loader2, Save, Download } from "lucide-react"
import { toast } from "sonner"
import { differenceInDays, parseISO, isValid } from "date-fns"

export default function AddPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const entryId = searchParams.get("id")

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [genreInput, setGenreInput] = useState("")
  const [languageInput, setLanguageInput] = useState("")
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

  // Fetch dropdown options from database
  useEffect(() => {
    async function fetchOptions() {
      const result = await getUniqueFieldValues()
      if (result.success && result.data) {
        setDropdownOptions(result.data)
      }
    }
    fetchOptions()
  }, [])

  // Fetch existing entry if editing
  useEffect(() => {
    let cancelled = false
    
    async function fetchEntry() {
      if (!entryId) {
        setFetching(false)
        return
      }
      
      setFetching(true)
      try {
        const result = await getEntry(entryId)

        if (cancelled) return

        if (!result.success || !result.data) {
          console.error("Error fetching entry:", result.error)
          toast.error(result.error || "Failed to load entry")
          router.push("/analytics")
          return
        }

        const data = result.data
        const genreArray = Array.isArray(data.genre) ? data.genre : data.genre ? [data.genre] : null
        const languageArray = (() => {
          const lang = data.language as string[] | string | null | undefined;
          if (!lang) return null;
          if (Array.isArray(lang)) return lang;
          if (typeof lang === 'string') {
            // Try to parse as JSON first (in case it's stored as JSON string like "[\"Korean\"]")
            try {
              const parsed = JSON.parse(lang);
              if (Array.isArray(parsed)) {
                return parsed.filter((l: any) => l && typeof l === 'string').map((l: string) => l.trim()).filter(Boolean);
              }
            } catch {
              // Not JSON, continue with comma-separated parsing
            }
            // Handle comma-separated string
            return lang.split(",").map((l: string) => l.trim()).filter(Boolean);
          }
          return null;
        })()
        
        if (cancelled) return
        
        setFormData({
          title: data.title || "",
          medium: data.medium || null,
          type: data.type || null,
          season: data.season || null,
          episodes: data.episodes || null,
          length: data.length || null,
          price: data.price || null,
          language: languageArray,
          platform: data.platform || null,
          status: data.status || null,
          genre: genreArray,
          my_rating: data.my_rating || null,
          average_rating: data.average_rating || null,
          rating: data.rating || null,
          start_date: data.start_date || null,
          finish_date: data.finish_date || null,
          time_taken: data.time_taken || null,
          poster_url: data.poster_url || null,
          imdb_id: data.imdb_id || null,
        })
        setGenreInput(genreArray ? genreArray.join(", ") : "")
        setLanguageInput(languageArray ? languageArray.join(", ") : "")
      } catch (err) {
        if (cancelled) return
        console.error("Error fetching entry:", err)
        toast.error("Failed to load entry")
        router.push("/analytics")
      } finally {
        if (!cancelled) {
          setFetching(false)
        }
      }
    }
    
    fetchEntry()
    
    return () => {
      cancelled = true
    }
  }, [entryId, router])

  // Auto-calculate time_taken when start_date or finish_date changes
  useEffect(() => {
    if (formData.start_date && formData.finish_date) {
      try {
        const start = parseISO(formData.start_date)
        const finish = parseISO(formData.finish_date)
        if (isValid(start) && isValid(finish)) {
          const days = differenceInDays(finish, start)
          if (days >= 0) {
            // Add 1 to make it inclusive (same day = 1 day)
            const totalDays = days + 1
            const calculatedTimeTaken = totalDays === 1 ? "1 day" : `${totalDays} days`
            setFormData((prev) => ({ ...prev, time_taken: calculatedTimeTaken }))
          }
        }
      } catch (error) {
        // Invalid date format, ignore
      }
    } else {
      // Clear time_taken if dates are incomplete
      setFormData((prev) => ({ ...prev, time_taken: null }))
    }
  }, [formData.start_date, formData.finish_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || formData.title.trim() === "") {
      toast.error("Title is required")
      return
    }

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

      if (entryId) {
        const result = await updateEntry(entryId, entryData)
        if (result.success) {
          toast.success("Entry updated successfully")
          router.push("/entries")
        } else {
          toast.error(result.error || "Failed to update entry")
        }
      } else {
        const result = await createEntry(entryData)
        if (result.success) {
          toast.success("Entry created successfully")
          router.push("/analytics")
        } else {
          toast.error(result.error || "Failed to create entry")
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGenreChange = (value: string) => {
    // Allow free typing - store raw input value
    setGenreInput(value)
    // Process into array in real-time for formData
    const genres = value
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0)
    setFormData({ ...formData, genre: genres.length > 0 ? genres : null })
  }

  const handleLanguageChange = (value: string) => {
    // Allow free typing - store raw input value
    setLanguageInput(value)
    // Process into array in real-time for formData
    const languages = value
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    setFormData({ ...formData, language: languages.length > 0 ? languages : null })
  }

  const handleFetchMetadata = async () => {
    if (!formData.title?.trim()) {
      toast.error("Please enter a title first")
      return
    }

    setFetchingMetadata(true)
    try {
      // Build URL with title and optional parameters
      let url = `/api/metadata?title=${encodeURIComponent(formData.title.trim())}`
      
      if (formData.medium) {
        // Map our medium values to OMDB type
        const typeMap: Record<string, string> = {
          "Movie": "movie",
          "TV Show": "series",
        }
        const omdbType = typeMap[formData.medium]
        if (omdbType) {
          url += `&type=${omdbType}`
        }
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

      // Update form data with fetched metadata (overwrites existing values)
      // Note: season and type are not overwritten - they use user input to fetch appropriate metadata
      const fetchedGenres = metadata.genre ? metadata.genre.split(",").map((g: string) => g.trim()).filter(Boolean) : []
      const fetchedLanguages = metadata.language ? metadata.language.split(",").map((l: string) => l.trim()).filter(Boolean) : []
      
      setFormData((prev) => {
        // Merge existing genres with fetched genres (avoid duplicates, case-insensitive)
        const existingGenres = prev.genre && Array.isArray(prev.genre) ? prev.genre : []
        const mergedGenres = [...existingGenres]
        fetchedGenres.forEach((g: string) => {
          const normalized = g.toLowerCase()
          if (!mergedGenres.some((eg: string) => eg.toLowerCase() === normalized)) {
            mergedGenres.push(g)
          }
        })
        
        // Merge existing languages with fetched languages (avoid duplicates, case-insensitive)
        const existingLanguages = prev.language && Array.isArray(prev.language) ? prev.language : []
        const mergedLanguages = [...existingLanguages]
        fetchedLanguages.forEach((l: string) => {
          const normalized = l.toLowerCase()
          if (!mergedLanguages.some((el: string) => el.toLowerCase() === normalized)) {
            mergedLanguages.push(l)
          }
        })
        
        // Update input fields to reflect merged values
        const genreText = mergedGenres.length > 0 ? mergedGenres.join(", ") : ""
        const languageText = mergedLanguages.length > 0 ? mergedLanguages.join(", ") : ""
        setGenreInput(genreText)
        setLanguageInput(languageText)
        
        return {
          ...prev,
          poster_url: metadata.poster_url || prev.poster_url,
          genre: mergedGenres.length > 0 ? mergedGenres : null,
          language: mergedLanguages.length > 0 ? mergedLanguages : null,
          average_rating: metadata.average_rating ?? prev.average_rating,
          length: metadata.length || prev.length,
          episodes: metadata.episodes ?? prev.episodes,
          imdb_id: metadata.imdb_id || prev.imdb_id,
        }
      })

      toast.success("Metadata fetched successfully")
    } catch (error) {
      console.error("Error fetching metadata:", error)
      toast.error(error instanceof Error ? error.message : "Failed to fetch metadata")
    } finally {
      setFetchingMetadata(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-mono">Loading entry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/analytics")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-mono uppercase tracking-wider">
              {entryId ? "Edit Entry" : "Add Entry"}
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title - Required */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-mono">
              Title <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter title"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchMetadata}
                disabled={fetchingMetadata || !formData.title?.trim()}
              >
                {fetchingMetadata ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Fetch Metadata
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Medium and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medium" className="text-sm font-mono">
                Medium
              </Label>
              {showNewInput.medium ? (
                <div className="flex gap-2">
                  <Input
                    id="medium"
                    value={newValue.medium}
                    onChange={(e) => setNewValue({ ...newValue, medium: e.target.value })}
                    placeholder="Enter new medium"
                    onBlur={() => {
                      if (newValue.medium.trim()) {
                        setFormData({ ...formData, medium: newValue.medium.trim() })
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
              <Label htmlFor="status" className="text-sm font-mono">
                Status
              </Label>
              {showNewInput.status ? (
                <div className="flex gap-2">
                  <Input
                    id="status"
                    value={newValue.status}
                    onChange={(e) => setNewValue({ ...newValue, status: e.target.value })}
                    placeholder="Enter new status"
                    onBlur={() => {
                      if (newValue.status.trim()) {
                        setFormData({ ...formData, status: newValue.status.trim() })
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
              <Label htmlFor="type" className="text-sm font-mono">
                Type
              </Label>
              {showNewInput.type ? (
                <div className="flex gap-2">
                  <Input
                    id="type"
                    value={newValue.type}
                    onChange={(e) => setNewValue({ ...newValue, type: e.target.value })}
                    placeholder="Enter new type"
                    onBlur={() => {
                      if (newValue.type.trim()) {
                        setFormData({ ...formData, type: newValue.type.trim() })
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
              <Label htmlFor="season" className="text-sm font-mono">
                Season
              </Label>
              <Input
                id="season"
                value={formData.season || ""}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="e.g., Season 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-mono">
                Language (comma-separated)
              </Label>
              <Input
                id="language"
                value={languageInput}
                onChange={(e) => handleLanguageChange(e.target.value)}
                placeholder="e.g., English, French, Spanish"
              />
            </div>
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <Label htmlFor="genre" className="text-sm font-mono">
              Genre (comma-separated)
            </Label>
            <Input
              id="genre"
              value={genreInput}
              onChange={(e) => handleGenreChange(e.target.value)}
              placeholder="e.g., Action, Drama, Comedy"
            />
          </div>

          {/* Platform, Episodes, Length */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform" className="text-sm font-mono">
                Platform
              </Label>
              {showNewInput.platform ? (
                <div className="flex gap-2">
                  <Input
                    id="platform"
                    value={newValue.platform}
                    onChange={(e) => setNewValue({ ...newValue, platform: e.target.value })}
                    placeholder="Enter new platform"
                    onBlur={() => {
                      if (newValue.platform.trim()) {
                        setFormData({ ...formData, platform: newValue.platform.trim() })
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
              <Label htmlFor="episodes" className="text-sm font-mono">
                Episodes
              </Label>
              <Input
                id="episodes"
                type="number"
                value={formData.episodes || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    episodes: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Number of episodes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="length" className="text-sm font-mono">
                Length
              </Label>
              <Input
                id="length"
                value={formData.length || ""}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                placeholder="e.g., 120 min, 300 pages"
              />
            </div>
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="my_rating" className="text-sm font-mono">
                My Rating
              </Label>
              <Input
                id="my_rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.my_rating || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    my_rating: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="0-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="average_rating" className="text-sm font-mono">
                Average Rating
              </Label>
              <Input
                id="average_rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.average_rating || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    average_rating: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="e.g., IMDb rating"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-sm font-mono">
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finish_date" className="text-sm font-mono">
                Finish Date
              </Label>
              <Input
                id="finish_date"
                type="date"
                value={formData.finish_date || ""}
                onChange={(e) => setFormData({ ...formData, finish_date: e.target.value || null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_taken" className="text-sm font-mono">
                Time Taken (Auto-calculated)
              </Label>
              <Input
                id="time_taken"
                value={formData.time_taken || ""}
                readOnly
                placeholder="Auto-calculated from dates"
                className="bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          {/* Price and IDs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-mono">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imdb_id" className="text-sm font-mono">
                IMDb ID
              </Label>
              <Input
                id="imdb_id"
                value={formData.imdb_id || ""}
                onChange={(e) => setFormData({ ...formData, imdb_id: e.target.value })}
                placeholder="tt1234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poster_url" className="text-sm font-mono">
                Poster URL
              </Label>
              <Input
                id="poster_url"
                type="url"
                value={formData.poster_url || ""}
                onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {entryId ? "Update Entry" : "Create Entry"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/analytics")}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
