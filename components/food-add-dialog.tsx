"use client"

import { useState, useEffect, useRef } from "react"
import { FoodEntry, FoodEntryInsert, FoodEntryUpdate, ItemOrdered } from "@/lib/database.types"
import { createFoodEntry, updateFoodEntry, uploadFoodImage, addFoodEntryImage, getFoodEntry, getFoodEntries, getUniqueCuisineTypes, getUniqueItemCategories } from "@/lib/food-actions"
import { PRICE_LEVELS, FOOD_TAGS, DINING_OPTIONS, formatDualCurrency, formatRestaurantDisplayName, USD_TO_KHR_RATE } from "@/lib/food-types"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Star,
    Loader2,
    X,
    Plus,
    MapPin,
    DollarSign,
    Calendar as CalendarIcon,
    Utensils,
    Camera,
    Upload,
    ImageIcon,
    Check,
    ChevronsUpDown,
} from "lucide-react"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns/format"
import { isValid } from "date-fns/isValid"
import Image from "next/image"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
} from "@/components/ui/carousel"
import { RatingInput, CuisineSelector, MultiSelectInput, PlaceImageUpload, ItemsOrderedInput, type PlaceImage, type ItemWithPreview } from "@/components/form-inputs"

interface FoodAddDialogProps {
    entry?: FoodEntry | null
    /** When set (and entry is null), form is initialized from this entry as a new visit (e.g. "Log again"); visit date defaults to initialDate or today. */
    template?: FoodEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (entry: FoodEntry) => void
    initialDate?: string
}


export function FoodAddDialog({
    entry,
    template,
    open,
    onOpenChange,
    onSuccess,
    initialDate,
}: FoodAddDialogProps) {
    const isEditing = !!entry
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [name, setName] = useState("")
    const [branch, setBranch] = useState("")
    const [visitDate, setVisitDate] = useState<Date | undefined>(
        entry?.visit_date
            ? new Date(entry.visit_date)
            : initialDate
                ? new Date(initialDate)
                : undefined
    )
    const [category, setCategory] = useState<string>("")
    const [address, setAddress] = useState("")
    const [googleMapsUrl, setGoogleMapsUrl] = useState("")
    const [neighborhood, setNeighborhood] = useState("")
    const [city, setCity] = useState("")
    const [country, setCountry] = useState("Cambodia")
    const [instagramHandle, setInstagramHandle] = useState("")
    const [websiteUrl, setWebsiteUrl] = useState("")
    const [cuisineTypes, setCuisineTypes] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [itemsOrdered, setItemsOrdered] = useState<(ItemOrdered & { file?: File; preview?: string })[]>([])
    const [favoriteItem, setFavoriteItem] = useState<string | null>(null)
    const [overallRating, setOverallRating] = useState<number | null>(null)
    const [foodRating, setFoodRating] = useState<number | null>(null)
    const [ambianceRating, setAmbianceRating] = useState<number | null>(null)
    const [serviceRating, setServiceRating] = useState<number | null>(null)
    const [valueRating, setValueRating] = useState<number | null>(null)
    const [totalPrice, setTotalPrice] = useState<string>("")
    const [priceLevel, setPriceLevel] = useState<string>("")
    const [diningType, setDiningType] = useState<string>("")
    const [wouldReturn, setWouldReturn] = useState<boolean | null>(null)
    const [notes, setNotes] = useState("")
    const [placeImages, setPlaceImages] = useState<{ file?: File; preview: string; is_primary: boolean }[]>([])
    const sidebarFileInputRef = useRef<HTMLInputElement>(null)
    const nameInputRef = useRef<HTMLInputElement>(null)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const baselineRef = useRef<string | null>(null)

    // Restaurant name autocomplete: suggestions and "just selected" to avoid refetch on autofill
    const [placeSuggestions, setPlaceSuggestions] = useState<FoodEntry[]>([])
    const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false)
    const justSelectedPlaceRef = useRef(false)
    const placeSearchQueryRef = useRef<string>("")
    const nameForSearchRef = useRef(name)
    nameForSearchRef.current = name

    const handlePlaceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const validFiles: File[] = []
        Array.from(files).forEach((file) => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} is too large (max 5MB)`)
            } else {
                validFiles.push(file)
            }
        })

        if (validFiles.length === 0) return

        const readPromises = validFiles.map((file, idx) => {
            return new Promise<{ file: File; preview: string; is_primary: boolean }>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    resolve({
                        file,
                        preview: reader.result as string,
                        is_primary: placeImages.length === 0 && idx === 0
                    })
                }
                reader.readAsDataURL(file)
            })
        })

        const newImages = await Promise.all(readPromises)
        setPlaceImages(prev => [...prev, ...newImages])

        if (sidebarFileInputRef.current) sidebarFileInputRef.current.value = ''
    }

    const [isAutofilling, setIsAutofilling] = useState(false)
    const [availableCuisines, setAvailableCuisines] = useState<string[]>([])
    const [availableItemCategories, setAvailableItemCategories] = useState<string[]>([])

    // Load available cuisines and item categories
    useEffect(() => {
        async function loadOptions() {
            const [cuisineResult, categoryResult] = await Promise.all([
                getUniqueCuisineTypes(),
                getUniqueItemCategories()
            ])
            if (cuisineResult.success) {
                setAvailableCuisines(cuisineResult.data)
            }
            if (categoryResult.success) {
                setAvailableItemCategories(categoryResult.data)
            }
        }
        loadOptions()
    }, [])

    // Debounced place search for restaurant name autocomplete (new entry only)
    useEffect(() => {
        if (!open || isEditing) return
        if (justSelectedPlaceRef.current) {
            justSelectedPlaceRef.current = false
            setPlaceSuggestions([])
            setPlaceSuggestionsOpen(false)
            return
        }
        const query = name.trim()
        if (query.length < 2) {
            setPlaceSuggestions([])
            setPlaceSuggestionsOpen(false)
            return
        }
        const timer = setTimeout(async () => {
            const result = await getFoodEntries({ search: query, limit: 30 })
            if (!result.success) return
            if (nameForSearchRef.current.trim() !== query) return
            const seen = new Set<string>()
            const deduped: FoodEntry[] = []
            for (const e of result.data) {
                const key = `${e.name}\0${e.branch ?? ""}`
                if (seen.has(key)) continue
                seen.add(key)
                deduped.push(e)
            }
            placeSearchQueryRef.current = query
            setPlaceSuggestions(deduped)
            setPlaceSuggestionsOpen(deduped.length > 0)
        }, 280)
        return () => clearTimeout(timer)
    }, [open, isEditing, name])

    // Calculate total from items for display
    const itemsTotal = itemsOrdered.reduce((sum, item) => sum + (item.price || 0), 0)
    const displayTotal = totalPrice ? parseFloat(totalPrice) : itemsTotal

    // Initialize form from entry, template (duplicate), or defaults
    useEffect(() => {
        if (entry) {
            setName(entry.name)
            setBranch(entry.branch ?? "")
            setVisitDate(entry.visit_date ? new Date(entry.visit_date + "T00:00:00") : undefined)
            setCategory(entry.category || "")
            setAddress(entry.address || "")
            setGoogleMapsUrl(entry.google_maps_url || "")
            setNeighborhood(entry.neighborhood || "")
            setCity(entry.city || "")
            setCountry(entry.country || "Cambodia")
            setInstagramHandle(entry.instagram_handle || "")
            setWebsiteUrl(entry.website_url || "")
            setCuisineTypes(entry.cuisine_type || [])
            setTags(entry.tags || [])
            // Map existing items to include preview property
            setItemsOrdered(
                (entry.items_ordered || []).map(item => ({
                    ...item,
                    preview: item.image_url || undefined
                }))
            )
            setFavoriteItem(entry.favorite_item || null)
            setOverallRating(entry.overall_rating)
            setFoodRating(entry.food_rating)
            setAmbianceRating(entry.ambiance_rating)
            setServiceRating(entry.service_rating)
            setValueRating(entry.value_rating)
            setTotalPrice(entry.total_price?.toString() || "")
            setPriceLevel(entry.price_level || "")
            setDiningType(entry.dining_type || "")
            setWouldReturn(entry.would_return ?? null)
            setNotes(entry.notes || "")
            setPlaceImages(entry.images?.map(img => ({
                preview: img.image_url,
                is_primary: img.is_primary
            })) || [])
            baselineRef.current = JSON.stringify({
                name: entry.name, branch: entry.branch ?? "", visitDate: entry.visit_date, category: entry.category || "", address: entry.address || "", googleMapsUrl: entry.google_maps_url || "",
                neighborhood: entry.neighborhood || "", city: entry.city || "", country: entry.country || "", instagramHandle: entry.instagram_handle || "", websiteUrl: entry.website_url || "",
                cuisineTypes: (entry.cuisine_type || []).slice().sort(), tags: (entry.tags || []).slice().sort(),
                items: (entry.items_ordered || []).map(i => ({ name: i.name, price: i.price })), favoriteItem: entry.favorite_item || "",
                overallRating: entry.overall_rating, foodRating: entry.food_rating, ambianceRating: entry.ambiance_rating, serviceRating: entry.service_rating, valueRating: entry.value_rating,
                totalPrice: entry.total_price?.toString() || "", priceLevel: entry.price_level || "", diningType: entry.dining_type || "", wouldReturn: entry.would_return ?? null, notes: entry.notes || "", placeImagesCount: entry.images?.length ?? 0
            })
        } else if (template) {
            // Duplicate: same place, new visit (visit date = initialDate or today)
            setName(template.name)
            setBranch(template.branch ?? "")
            setVisitDate(initialDate ? new Date(initialDate) : new Date())
            setCategory(template.category || "")
            setAddress(template.address || "")
            setGoogleMapsUrl(template.google_maps_url || "")
            setNeighborhood(template.neighborhood || "")
            setCity(template.city || "")
            setCountry(template.country || "Cambodia")
            setInstagramHandle(template.instagram_handle || "")
            setWebsiteUrl(template.website_url || "")
            setCuisineTypes(template.cuisine_type || [])
            setTags(template.tags || [])
            setItemsOrdered(
                (template.items_ordered || []).map(item => ({
                    ...item,
                    preview: item.image_url || undefined
                }))
            )
            setFavoriteItem(template.favorite_item || null)
            setOverallRating(template.overall_rating)
            setFoodRating(template.food_rating)
            setAmbianceRating(template.ambiance_rating)
            setServiceRating(template.service_rating)
            setValueRating(template.value_rating)
            setTotalPrice(template.total_price?.toString() || "")
            setPriceLevel(template.price_level || "")
            setDiningType(template.dining_type || "")
            setWouldReturn(template.would_return ?? null)
            setNotes(template.notes || "")
            setPlaceImages(template.images?.map(img => ({
                preview: img.image_url,
                is_primary: img.is_primary
            })) || [])
            const templateVisitDate = initialDate ? new Date(initialDate) : new Date()
            baselineRef.current = JSON.stringify({
                name: template.name, branch: template.branch ?? "", visitDate: format(templateVisitDate, "yyyy-MM-dd"), category: template.category || "", address: template.address || "", googleMapsUrl: template.google_maps_url || "",
                neighborhood: template.neighborhood || "", city: template.city || "", country: template.country || "", instagramHandle: template.instagram_handle || "", websiteUrl: template.website_url || "",
                cuisineTypes: (template.cuisine_type || []).slice().sort(), tags: (template.tags || []).slice().sort(),
                items: (template.items_ordered || []).map(i => ({ name: i.name, price: i.price })), favoriteItem: template.favorite_item || "",
                overallRating: template.overall_rating, foodRating: template.food_rating, ambianceRating: template.ambiance_rating, serviceRating: template.service_rating, valueRating: template.value_rating,
                totalPrice: template.total_price?.toString() || "", priceLevel: template.price_level || "", diningType: template.dining_type || "", wouldReturn: template.would_return ?? null, notes: template.notes || "", placeImagesCount: template.images?.length ?? 0
            })
        } else {
            // Reset for new entry
            setName("")
            setBranch("")
            setVisitDate(initialDate ? new Date(initialDate) : new Date())
            setCategory("")
            setAddress("")
            setGoogleMapsUrl("")
            setNeighborhood("")
            setCity("")
            setCountry("Cambodia")
            setInstagramHandle("")
            setWebsiteUrl("")
            setCuisineTypes([])
            setTags([])
            setItemsOrdered([])
            setFavoriteItem(null)
            setOverallRating(null)
            setFoodRating(null)
            setAmbianceRating(null)
            setServiceRating(null)
            setValueRating(null)
            setTotalPrice("")
            setPriceLevel("")
            setDiningType("")
            setWouldReturn(null)
            setNotes("")
            setPlaceImages([])
            const defaultVisit = initialDate ? new Date(initialDate) : new Date()
            baselineRef.current = JSON.stringify({
                name: "", branch: "", visitDate: format(defaultVisit, "yyyy-MM-dd"), category: "", address: "", googleMapsUrl: "", neighborhood: "", city: "", country: "Cambodia", instagramHandle: "", websiteUrl: "",
                cuisineTypes: [], tags: [], items: [], favoriteItem: "", overallRating: null, foodRating: null, ambianceRating: null, serviceRating: null, valueRating: null,
                totalPrice: "", priceLevel: "", diningType: "", wouldReturn: null, notes: "", placeImagesCount: 0
            })
        }
    }, [entry, template, initialDate, open])

    // When opening edit with an entry that has no images (e.g. from calendar), fetch full entry so place images load
    useEffect(() => {
        if (!open || !entry?.id) return
        const hasImages = entry.images && entry.images.length > 0
        if (hasImages) return

        let cancelled = false
        getFoodEntry(entry.id).then((result) => {
            if (cancelled || !result.success) return
            const fullEntry = result.data as { images?: { image_url: string; is_primary: boolean }[] }
            if (fullEntry.images && fullEntry.images.length > 0) {
                setPlaceImages(
                    fullEntry.images.map((img) => ({
                        preview: img.image_url,
                        is_primary: img.is_primary,
                    }))
                )
            }
        })
        return () => {
            cancelled = true
        }
    }, [open, entry?.id, entry?.images?.length])

    useEffect(() => {
        if (!open) baselineRef.current = null
    }, [open])

    // Focus first field when opening for new entry
    useEffect(() => {
        if (!open || entry) return
        const t = setTimeout(() => nameInputRef.current?.focus(), 100)
        return () => clearTimeout(t)
    }, [open, entry])

    const getCurrentSnapshot = () =>
        JSON.stringify({
            name: name,
            branch: branch,
            visitDate: visitDate && isValid(visitDate) ? format(visitDate, "yyyy-MM-dd") : "",
            category: category,
            address: address,
            googleMapsUrl: googleMapsUrl,
            neighborhood: neighborhood,
            city: city,
            country: country,
            instagramHandle: instagramHandle,
            websiteUrl: websiteUrl,
            cuisineTypes: [...cuisineTypes].sort(),
            tags: [...tags].sort(),
            items: itemsOrdered.map(i => ({ name: i.name, price: i.price })),
            favoriteItem: favoriteItem || "",
            overallRating: overallRating,
            foodRating: foodRating,
            ambianceRating: ambianceRating,
            serviceRating: serviceRating,
            valueRating: valueRating,
            totalPrice: totalPrice,
            priceLevel: priceLevel,
            diningType: diningType,
            wouldReturn: wouldReturn,
            notes: notes,
            placeImagesCount: placeImages.length,
        })
    const isDirty = baselineRef.current !== null && getCurrentSnapshot() !== baselineRef.current

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && isDirty) {
            setShowDiscardConfirm(true)
            return
        }
        onOpenChange(nextOpen)
    }

    const handleConfirmDiscard = () => {
        setShowDiscardConfirm(false)
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error("Please enter a name")
            return
        }

        if (!visitDate) {
            toast.error("Please select a date")
            return
        }

        setIsSubmitting(true)

        try {
            // When items exist, always use their sum as total_price so the card shows the correct value after edit
            const finalTotal =
                itemsOrdered.length > 0
                    ? itemsTotal || null
                    : (totalPrice ? parseFloat(totalPrice) || null : null)

            // Prepare items data (without file references for database)
            const itemsForDb: ItemOrdered[] = itemsOrdered.map(item => ({
                name: item.name,
                price: item.price,
                image_url: item.image_url || (item.preview?.startsWith('data:') ? null : item.preview) || null,
                category: item.category || item.categories?.[0] || null,
                categories: item.categories || (item.category ? [item.category] : null)
            }))

            const data: FoodEntryInsert | FoodEntryUpdate = {
                name: name.trim(),
                branch: branch.trim() || null,
                visit_date: visitDate && isValid(visitDate) ? format(visitDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
                category: category || null,
                address: address || null,
                google_maps_url: googleMapsUrl || null,
                neighborhood: neighborhood || null,
                city: city || null,
                country: country || null,
                instagram_handle: instagramHandle || null,
                website_url: websiteUrl || null,
                cuisine_type: cuisineTypes.length > 0 ? cuisineTypes : null,
                tags: tags.length > 0 ? tags : null,
                items_ordered: itemsForDb.length > 0 ? itemsForDb : null,
                favorite_item: favoriteItem,
                overall_rating: overallRating,
                food_rating: foodRating,
                ambiance_rating: ambianceRating,
                service_rating: serviceRating,
                value_rating: valueRating,
                total_price: finalTotal,
                currency: "USD",
                price_level: priceLevel || null,
                dining_type: diningType || null,
                would_return: wouldReturn,
                notes: notes || null,
            }

            let result
            if (isEditing && entry) {
                result = await updateFoodEntry(entry.id, data)
            } else {
                result = await createFoodEntry(data as FoodEntryInsert)
            }

            if (result.success) {
                const entryId = result.data.id

                // Upload place images
                if (placeImages.length > 0) {
                    for (const img of placeImages) {
                        if (img.file) {
                            const uploadResult = await uploadFoodImage(img.file, entryId, 'place')
                            if (uploadResult.success) {
                                await addFoodEntryImage({
                                    food_entry_id: entryId,
                                    image_url: uploadResult.data.url,
                                    storage_path: uploadResult.data.path,
                                    is_primary: img.is_primary
                                } as any)
                            }
                        }
                    }
                }

                // Upload item images and update items
                if (itemsOrdered.length > 0) {
                    const updatedItems = [...itemsOrdered]
                    let hasNewItemImages = false

                    for (let i = 0; i < updatedItems.length; i++) {
                        const item = updatedItems[i]
                        if (item.file) {
                            const uploadResult = await uploadFoodImage(item.file, entryId, 'item', i)
                            if (uploadResult.success) {
                                updatedItems[i] = {
                                    ...item,
                                    image_url: uploadResult.data.url,
                                    file: undefined, // Clear file to avoid re-upload logic if we were to re-submit (though we close dialog)
                                    preview: undefined
                                }
                                hasNewItemImages = true
                            }
                        }
                    }

                    if (hasNewItemImages) {
                        // Update the entry with new item image URLs
                        const itemsForDb: ItemOrdered[] = updatedItems.map(item => ({
                            name: item.name,
                            price: item.price,
                            image_url: item.image_url || null,
                            category: item.category || item.categories?.[0] || null,
                            categories: item.categories || (item.category ? [item.category] : null)
                        }))

                        await updateFoodEntry(entryId, { items_ordered: itemsForDb })
                    }
                }

                toast.success(isEditing ? "Entry updated" : "Entry added")
                onSuccess(result.data)
                onOpenChange(false)
            } else {
                toast.error(result.error || "Failed to save entry")
            }
        } catch (error) {
            console.error("Error saving entry:", error)
            toast.error("An error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    const isMapsUrl = (s: string) =>
        /google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(s?.trim() ?? "")

    const applyPlaceSuggestion = (e: FoodEntry) => {
        justSelectedPlaceRef.current = true
        setName(e.name)
        setBranch(e.branch ?? "")
        setCategory(e.category ?? "")
        setCuisineTypes(e.cuisine_type ?? [])
        setAddress(e.address ?? "")
        setGoogleMapsUrl(e.google_maps_url ?? "")
        setNeighborhood(e.neighborhood ?? "")
        setCity(e.city ?? "")
        setCountry(e.country ?? "Cambodia")
        setInstagramHandle(e.instagram_handle ?? "")
        setWebsiteUrl(e.website_url ?? "")
        setPlaceSuggestions([])
        setPlaceSuggestionsOpen(false)
    }

    const handleAutofill = async (urlOverride?: string) => {
        const urlToUse = urlOverride ?? googleMapsUrl
        if (!urlToUse?.trim()) {
            toast.error("Please enter a Google Maps URL first")
            return
        }

        setIsAutofilling(true)
        try {
            const response = await fetch("/api/maps/place-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: urlToUse.trim() }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch place details")
            }

            if (data.name) setName(data.name)
            if (data.address) setAddress(data.address)
            if (data.website) setWebsiteUrl(data.website)
            if (data.neighborhood) setNeighborhood(data.neighborhood)
            if (data.city) setCity(data.city)
            if (data.country) setCountry(data.country)
            if (data.priceLevel) setPriceLevel(data.priceLevel)

            // Add photos from Google Places to placeImages
            if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
                const newImages = data.photos.map((photoUrl: string, index: number) => ({
                    preview: photoUrl,
                    is_primary: index === 0 // First photo is primary
                }))
                setPlaceImages(prev => [...prev, ...newImages])
            }

            toast.success("Autofilled from Google Maps")
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Failed to autofill")
        } finally {
            setIsAutofilling(false)
        }
    }
    const [activeTab, setActiveTab] = useState("general")
    const tabs = ["general", "location", "items", "ratings", "notes"] as const

    // Always open on general tab when dialog opens (add, edit, or duplicate)
    useEffect(() => {
        if (open) setActiveTab("general")
    }, [open])

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl p-0 h-[90vh] md:h-[85vh] flex flex-col gap-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden border-b bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                        {/* Small Photo */}
                        <div className="w-12 h-12 relative rounded overflow-hidden border shadow-sm bg-muted flex-shrink-0 group">
                            {placeImages.length > 0 ? (
                                <Image
                                    src={placeImages.find(img => img.is_primary)?.preview || placeImages[0]?.preview}
                                    alt={name || "New Entry"}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-lg text-muted-foreground">
                                    <Utensils className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                        {/* Title */}
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="font-semibold text-base truncate h-auto leading-none">
                                {isEditing ? (name ? formatRestaurantDisplayName({ name, branch }) : "Edit Entry") : "Add New Entry"}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground truncate">
                                {visitDate && isValid(visitDate) ? format(visitDate, "PPP") : "Add details for your food review"}
                            </DialogDescription>
                        </div>
                    </div>
                    {/* Horizontal Tabs */}
                    <div className="flex gap-1 mt-3 overflow-x-auto">
                        {tabs.map(tab => (
                            <Button
                                key={tab}
                                variant={activeTab === tab ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 text-xs flex-shrink-0 capitalize",
                                    activeTab === tab && "bg-secondary font-medium"
                                )}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </Button>
                        ))}
                    </div>
                    {/* Quick: Paste Maps URL (mobile, any tab) */}
                    <div className="flex gap-1.5 mt-3">
                        <Input
                            value={googleMapsUrl}
                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                            onPaste={(e) => {
                                const pasted = e.clipboardData.getData("text")?.trim()
                                if (pasted && isMapsUrl(pasted)) {
                                    e.preventDefault()
                                    setGoogleMapsUrl(pasted)
                                    handleAutofill(pasted)
                                }
                            }}
                            placeholder="Paste Maps link to fill…"
                            type="url"
                            className="h-8 text-xs flex-1 min-w-0"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 shrink-0 px-2"
                            onClick={() => handleAutofill()}
                            disabled={!googleMapsUrl?.trim() || isAutofilling}
                        >
                            {isAutofilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Fill"}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:flex w-64 bg-muted/30 border-r flex-col p-5 gap-5 overflow-y-auto shrink-0">
                        {/* Photo Gallery Carousel */}
                        {placeImages.length > 0 ? (
                            <Carousel className="w-full" opts={{ loop: true }}>
                                <CarouselContent>
                                    {placeImages.map((img, index) => (
                                        <CarouselItem key={index}>
                                            <div className="aspect-[3/4] relative rounded-lg overflow-hidden border shadow-sm bg-muted w-full group">
                                                <Image
                                                    src={img.preview}
                                                    alt={`Photo ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                                {img.is_primary && (
                                                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                                        Primary
                                                    </div>
                                                )}
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                {placeImages.length > 1 && (
                                    <>
                                        <CarouselPrevious className="-left-3 h-7 w-7" />
                                        <CarouselNext className="-right-3 h-7 w-7" />
                                    </>
                                )}
                            </Carousel>
                        ) : (
                            <div className="aspect-[3/4] relative rounded-lg overflow-hidden border shadow-sm bg-muted self-center w-full group shrink-0">
                                <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
                                    <Utensils className="h-12 w-12" />
                                </div>
                                {/* Quick upload overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:text-white hover:bg-white/20"
                                        onClick={() => sidebarFileInputRef.current?.click()}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Add Photos
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Photo count */}
                        {placeImages.length > 0 && (
                            <p className="text-xs text-center text-muted-foreground">
                                {placeImages.length} photo{placeImages.length !== 1 ? 's' : ''}
                            </p>
                        )}

                        {/* Quick: Paste Maps URL — hidden on desktop; use inline URL in main content */}
                        <div className="space-y-1.5 w-full hidden">
                            <p className="text-xs font-medium text-muted-foreground">Paste Maps URL</p>
                            <div className="flex gap-1.5">
                                <Input
                                    value={googleMapsUrl}
                                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                    onPaste={(e) => {
                                        const pasted = e.clipboardData.getData("text")?.trim()
                                        if (pasted && isMapsUrl(pasted)) {
                                            e.preventDefault()
                                            setGoogleMapsUrl(pasted)
                                            handleAutofill(pasted)
                                        }
                                    }}
                                    placeholder="Maps link…"
                                    type="url"
                                    className="h-8 text-xs flex-1 min-w-0"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 shrink-0 px-2"
                                    onClick={() => handleAutofill()}
                                    disabled={!googleMapsUrl?.trim() || isAutofilling}
                                >
                                    {isAutofilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Fill"}
                                </Button>
                            </div>
                        </div>

                        {/* Navigation Tabs (Vertical) */}
                        <div className="flex flex-col gap-1 w-full flex-1">
                            {tabs.map(tab => (
                                <Button
                                    key={tab}
                                    variant={activeTab === tab ? "secondary" : "ghost"}
                                    className={cn(
                                        "justify-start h-9 truncate capitalize",
                                        activeTab === tab && "bg-secondary font-medium"
                                    )}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === "items" ? "Items Ordered" : tab === "ratings" ? "Ratings & Price" : tab}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-full">
                        {/* Desktop Header */}
                        <DialogHeader className="hidden md:block px-6 py-4 border-b shrink-0">
                            <DialogTitle className="text-xl truncate" title={name ? formatRestaurantDisplayName({ name, branch }) : "New Entry"}>
                                {isEditing ? "Edit Entry" : "Add New Entry"}
                                {name && <span className="text-muted-foreground font-normal text-base ml-2">{formatRestaurantDisplayName({ name, branch })}</span>}
                            </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="flex-1">
                            <form
                                onSubmit={handleSubmit}
                                className="p-4 md:p-6"
                                onKeyDown={(e) => {
                                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                        e.preventDefault()
                                        handleSubmit(e)
                                    }
                                }}
                            >
                                {/* GENERAL TAB */}
                                {activeTab === "general" && (
                                    <div className="space-y-6">
                                        {/* Place Photos (Upload / Take Photo + autofill input inline) */}
                                        <PlaceImageUpload
                                            images={placeImages}
                                            onImagesChange={setPlaceImages}
                                            onFileSelect={handlePlaceFileSelect}
                                            trailing={
                                                <div className="hidden md:flex items-center gap-2 flex-1 min-w-[180px]">
                                                    <Input
                                                        id="generalGoogleMapsUrl"
                                                        value={googleMapsUrl}
                                                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                                        onPaste={(e) => {
                                                            const pasted = e.clipboardData.getData("text")?.trim()
                                                            if (pasted && isMapsUrl(pasted)) {
                                                                e.preventDefault()
                                                                setGoogleMapsUrl(pasted)
                                                                handleAutofill(pasted)
                                                            }
                                                        }}
                                                        placeholder="Paste Google Maps link to auto-fill"
                                                        type="url"
                                                        className="h-9 flex-1 min-w-0 text-sm placeholder:text-muted-foreground/70 border-dashed"
                                                    />
                                                    {isAutofilling && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Filling…
                                                        </span>
                                                    )}
                                                </div>
                                            }
                                        />

                                        <Separator />

                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-full">
                                                <Label htmlFor="name">Restaurant / Place Name <span className="text-red-500">*</span></Label>
                                                <Popover open={placeSuggestionsOpen && placeSuggestions.length > 0} onOpenChange={(open) => !open && setPlaceSuggestionsOpen(false)}>
                                                    <PopoverAnchor asChild>
                                                        <div className="relative">
                                                            <Input
                                                                ref={nameInputRef}
                                                                id="name"
                                                                value={name}
                                                                onChange={(e) => setName(e.target.value)}
                                                                placeholder="e.g., Sushi Masato (type to see existing places)"
                                                                required
                                                                autoComplete="off"
                                                            />
                                                        </div>
                                                    </PopoverAnchor>
                                                    <PopoverContent
                                                        className="w-[var(--radix-popover-trigger-width)] p-0"
                                                        align="start"
                                                        sideOffset={4}
                                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                                        onCloseAutoFocus={(e) => e.preventDefault()}
                                                    >
                                                        <Command
                                                            shouldFilter={false}
                                                            onPointerDown={(e) => e.preventDefault()}
                                                        >
                                                            <CommandList>
                                                                <CommandEmpty>No places found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {placeSuggestions.map((e) => (
                                                                        <CommandItem
                                                                            key={`${e.name}\0${e.branch ?? ""}`}
                                                                            value={`${e.name}\0${e.branch ?? ""}`}
                                                                            onSelect={() => applyPlaceSuggestion(e)}
                                                                        >
                                                                            {formatRestaurantDisplayName({ name: e.name, branch: e.branch ?? "" })}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2 col-span-full">
                                                <Label htmlFor="branch">Branch / Location</Label>
                                                <Input
                                                    id="branch"
                                                    value={branch}
                                                    onChange={(e) => setBranch(e.target.value)}
                                                    placeholder="e.g., Mall, Airport"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Cuisine Type</Label>
                                                <CuisineSelector
                                                    value={cuisineTypes}
                                                    onChange={setCuisineTypes}
                                                    options={[...new Set([...availableCuisines, ...cuisineTypes])].sort()}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="category">Category</Label>
                                                <Select value={category} onValueChange={setCategory}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                                                        <SelectItem value="Bar">Bar</SelectItem>
                                                        <SelectItem value="Cafe">Cafe</SelectItem>
                                                        <SelectItem value="Street Food">Street Food</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Visit Date <span className="text-red-500">*</span></Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal",
                                                                !visitDate && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {visitDate && isValid(visitDate) ? format(visitDate, "PPP") : "Pick a date"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={visitDate}
                                                            onSelect={setVisitDate}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="diningType">Dining type</Label>
                                                <Select value={diningType || "_none"} onValueChange={(v) => setDiningType(v === "_none" ? "" : v)}>
                                                    <SelectTrigger id="diningType">
                                                        <SelectValue placeholder="Not set" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="_none">—</SelectItem>
                                                        {DINING_OPTIONS.map((opt) => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* LOCATION TAB */}
                                {activeTab === "location" && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="locationGoogleMapsUrl">Google Maps URL</Label>
                                            <Input
                                                id="locationGoogleMapsUrl"
                                                value={googleMapsUrl}
                                                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                                placeholder="https://maps.google.com/..."
                                                type="url"
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="neighborhood">Neighborhood</Label>
                                                <Input
                                                    id="neighborhood"
                                                    value={neighborhood}
                                                    onChange={(e) => setNeighborhood(e.target.value)}
                                                    placeholder="e.g., BKK1"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City</Label>
                                                <Input
                                                    id="city"
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    placeholder="e.g., Phnom Penh"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address">Full Address</Label>
                                            <Textarea
                                                id="address"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Full address..."
                                                rows={2}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="instagramHandle">Instagram</Label>
                                                <Input
                                                    id="instagramHandle"
                                                    value={instagramHandle}
                                                    onChange={(e) => setInstagramHandle(e.target.value)}
                                                    placeholder="@restaurant"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="websiteUrl">Website</Label>
                                                <Input
                                                    id="websiteUrl"
                                                    value={websiteUrl}
                                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                                    placeholder="https://..."
                                                    type="url"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ITEMS TAB */}
                                {activeTab === "items" && (
                                    <div className="space-y-4">
                                        <ItemsOrderedInput
                                            value={itemsOrdered}
                                            onChange={(newItems) => {
                                                setItemsOrdered(newItems)
                                                const sum = newItems.reduce((s, i) => s + (i.price ?? 0), 0)
                                                setTotalPrice(sum > 0 ? sum.toFixed(2) : "")
                                            }}
                                            favoriteItem={favoriteItem}
                                            onFavoriteChange={setFavoriteItem}
                                            availableCategories={availableItemCategories}
                                        />
                                    </div>
                                )}

                                {/* RATINGS TAB */}
                                {activeTab === "ratings" && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <Star className="h-4 w-4" />
                                                Ratings
                                            </h4>
                                            <div className="space-y-3">
                                                <RatingInput label="Overall" value={overallRating} onChange={setOverallRating} />
                                                <RatingInput label="Food" value={foodRating} onChange={setFoodRating} />
                                                <RatingInput label="Ambiance" value={ambianceRating} onChange={setAmbianceRating} />
                                                <RatingInput label="Service" value={serviceRating} onChange={setServiceRating} />
                                                <RatingInput label="Value" value={valueRating} onChange={setValueRating} />
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Price
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="totalPrice">Total (USD)</Label>
                                                    <div className="space-y-1">
                                                        <Input
                                                            id="totalPrice"
                                                            value={totalPrice}
                                                            onChange={(e) => setTotalPrice(e.target.value)}
                                                            placeholder={itemsTotal > 0 ? itemsTotal.toString() : "0"}
                                                            type="number"
                                                            step="0.01"
                                                        />
                                                        {displayTotal > 0 && (
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                = ៛{(displayTotal * USD_TO_KHR_RATE).toLocaleString()} KHR
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="priceLevel">Price Level</Label>
                                                    <Select value={priceLevel} onValueChange={setPriceLevel}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {PRICE_LEVELS.map((level) => (
                                                                <SelectItem key={level} value={level}>
                                                                    {level}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="wouldReturn">Would go back</Label>
                                            <Select
                                                value={wouldReturn === null ? "_none" : wouldReturn ? "true" : "false"}
                                                onValueChange={(v) => setWouldReturn(v === "_none" ? null : v === "true")}
                                            >
                                                <SelectTrigger id="wouldReturn">
                                                    <SelectValue placeholder="Not set" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_none">— Not set</SelectItem>
                                                    <SelectItem value="true">Yes</SelectItem>
                                                    <SelectItem value="false">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* NOTES TAB */}
                                {activeTab === "notes" && (
                                    <div className="space-y-4">
                                        <MultiSelectInput
                                            label="Tags"
                                            options={FOOD_TAGS}
                                            value={tags}
                                            onChange={setTags}
                                            placeholder="Select tags..."
                                        />

                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Textarea
                                                id="notes"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Any additional notes about your experience..."
                                                rows={6}
                                            />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="border-t p-4 flex justify-between bg-muted/20 shrink-0 w-full z-10">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : isEditing ? (
                                    "Update Entry"
                                ) : (
                                    "Add Entry"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hidden file input for sidebar upload */}
                <input
                    ref={sidebarFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePlaceFileSelect}
                />
            </DialogContent>
        </Dialog>

        {/* Discard changes confirmation */}
        <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Discard changes?</DialogTitle>
                    <DialogDescription>
                        You have unsaved changes. Are you sure you want to close? Your changes will be lost.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowDiscardConfirm(false)}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleConfirmDiscard}>
                        Discard
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}

export default FoodAddDialog
