"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { differenceInDays } from "date-fns/differenceInDays"
import { parseISO } from "date-fns/parseISO"
import { isValid } from "date-fns/isValid"
import { createEntry, updateEntry, CreateEntryInput, getUniqueFieldValues, getEntry } from "@/lib/actions"

export type MediaFormData = Partial<CreateEntryInput>

export function useMediaForm(entryId?: string | null) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)

    // Custom input states
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

    const [formData, setFormData] = useState<MediaFormData>({
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

    // Fetch dropdown options
    useEffect(() => {
        async function fetchOptions() {
            const result = await getUniqueFieldValues()
            if (result.success) {
                setDropdownOptions(result.data)
            }
        }
        fetchOptions()
    }, [])

    // Fetch existing entry
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

                if (!result.success) {
                    console.error("Error fetching entry:", result.error)
                    toast.error(result.error || "Failed to load entry")
                    router.push("/movies/analytics")
                    return
                }

                const data = result.data
                const genreArray = Array.isArray(data.genre) ? data.genre : data.genre ? [data.genre] : null
                const languageArray = (() => {
                    const lang = data.language as string[] | string | null | undefined;
                    if (!lang) return null;
                    if (Array.isArray(lang)) return lang;
                    if (typeof lang === 'string') {
                        try {
                            const parsed = JSON.parse(lang);
                            if (Array.isArray(parsed)) {
                                return parsed.filter((l: any) => l && typeof l === 'string').map((l: string) => l.trim()).filter(Boolean);
                            }
                        } catch {
                            // Not JSON
                        }
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
                router.push("/movies/analytics")
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

    // Auto-calculate time_taken
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
                // Invalid date format
            }
        } else {
            setFormData((prev) => ({ ...prev, time_taken: null }))
        }
    }, [formData.start_date, formData.finish_date])

    const handleGenreChange = (value: string) => {
        setGenreInput(value)
        const genres = value.split(",").map((g) => g.trim()).filter((g) => g.length > 0)
        setFormData({ ...formData, genre: genres.length > 0 ? genres : null })
    }

    const handleLanguageChange = (value: string) => {
        setLanguageInput(value)
        const languages = value.split(",").map((l) => l.trim()).filter((l) => l.length > 0)
        setFormData({ ...formData, language: languages.length > 0 ? languages : null })
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB')
            return
        }

        setUploadingImage(true)

        try {
            const uploadFormData = new FormData()
            uploadFormData.append('file', file)
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
            e.target.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent, returnTo?: string | null) => {
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
                    router.push(returnTo || "/movies")
                } else {
                    toast.error(result.error || "Failed to update entry")
                }
            } else {
                const result = await createEntry(entryData)
                if (result.success) {
                    toast.success("Entry created successfully")
                    router.push("/movies/analytics")
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
            let finalGenres: string[] = []
            if (fieldsToOverride?.genre && fetchedGenres.length > 0) {
                finalGenres = fetchedGenres
            } else if (fieldsToOverride?.genre === false) {
                finalGenres = prev.genre && Array.isArray(prev.genre) ? prev.genre : []
            } else {
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

            let finalLanguages: string[] = []
            if (fieldsToOverride?.language && fetchedLanguages.length > 0) {
                finalLanguages = fetchedLanguages
            } else if (fieldsToOverride?.language === false) {
                finalLanguages = prev.language && Array.isArray(prev.language) ? prev.language : []
            } else {
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

    const handleConfirmOverride = (sourceForToast?: string) => {
        if (pendingMetadata) {
            applyMetadata(pendingMetadata, overrideFields)
            if (sourceForToast) {
                toast.success(`Metadata fetched successfully from ${sourceForToast}`)
            }
        }
        setShowOverrideDialog(false)
        setPendingMetadata(null)
    }

    const handleCancelOverride = () => {
        setShowOverrideDialog(false)
        setPendingMetadata(null)
    }

    return {
        formData,
        setFormData,
        loading,
        fetching,
        uploadingImage,
        genreInput,
        setGenreInput,
        languageInput,
        setLanguageInput,
        dropdownOptions,
        setDropdownOptions,
        showNewInput,
        setShowNewInput,
        newValue,
        setNewValue,
        handleGenreChange,
        handleLanguageChange,
        handleImageUpload,
        handleSubmit,
        // Metadata states and handlers
        showOverrideDialog,
        setShowOverrideDialog,
        pendingMetadata,
        setPendingMetadata,
        overrideFields,
        setOverrideFields,
        applyMetadata,
        handleConfirmOverride,
        handleCancelOverride
    }
}
