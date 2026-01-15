"use client"

import { useState, useEffect, useRef } from "react"
import { FoodEntry, FoodEntryInsert, FoodEntryUpdate, ItemOrdered } from "@/lib/database.types"
import { createFoodEntry, updateFoodEntry, uploadFoodImage, addFoodEntryImage, getUniqueCuisineTypes, getUniqueItemCategories } from "@/lib/food-actions"
import { PRICE_LEVELS, FOOD_TAGS, formatDualCurrency, USD_TO_KHR_RATE } from "@/lib/food-types"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (entry: FoodEntry) => void
    initialDate?: string
}


export function FoodAddDialog({
    entry,
    open,
    onOpenChange,
    onSuccess,
    initialDate,
}: FoodAddDialogProps) {
    const isEditing = !!entry
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [name, setName] = useState("")
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
    const [notes, setNotes] = useState("")
    const [placeImages, setPlaceImages] = useState<{ file?: File; preview: string; is_primary: boolean }[]>([])
    const sidebarFileInputRef = useRef<HTMLInputElement>(null)

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

    // Calculate total from items for display
    const itemsTotal = itemsOrdered.reduce((sum, item) => sum + (item.price || 0), 0)
    const displayTotal = totalPrice ? parseFloat(totalPrice) : itemsTotal

    // Initialize form from entry or defaults
    useEffect(() => {
        if (entry) {
            setName(entry.name)
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
            setNotes(entry.notes || "")
            setPlaceImages(entry.images?.map(img => ({
                preview: img.image_url,
                is_primary: img.is_primary
            })) || [])
        } else {
            // Reset for new entry
            setName("")
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
            setNotes("")
            setPlaceImages([])
        }
    }, [entry, initialDate, open])

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
            // Calculate final total - use manual entry if provided, otherwise sum of items
            const finalTotal = totalPrice ? parseFloat(totalPrice) : itemsTotal || null

            // Prepare items data (without file references for database)
            const itemsForDb: ItemOrdered[] = itemsOrdered.map(item => ({
                name: item.name,
                price: item.price,
                image_url: item.image_url || item.preview || null,
                category: item.category || null
            }))

            const data: FoodEntryInsert | FoodEntryUpdate = {
                name: name.trim(),
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
                            category: item.category || null
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

    const handleAutofill = async () => {
        if (!googleMapsUrl) {
            toast.error("Please enter a Google Maps URL first")
            return
        }

        setIsAutofilling(true)
        try {
            const response = await fetch("/api/maps/place-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: googleMapsUrl }),
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
            if (data.rating) setOverallRating(data.rating)
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                {isEditing ? name || "Edit Entry" : "Add New Entry"}
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
                            <DialogTitle className="text-xl truncate" title={name || "New Entry"}>
                                {isEditing ? "Edit Entry" : "Add New Entry"}
                                {name && <span className="text-muted-foreground font-normal text-base ml-2">{name}</span>}
                            </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="flex-1">
                            <form onSubmit={handleSubmit} className="p-4 md:p-6">
                                {/* GENERAL TAB */}
                                {activeTab === "general" && (
                                    <div className="space-y-6">
                                        {/* Place Photos */}
                                        <PlaceImageUpload
                                            images={placeImages}
                                            onImagesChange={setPlaceImages}
                                            onFileSelect={handlePlaceFileSelect}
                                        />

                                        <Separator />

                                        {/* Basic Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-full">
                                                <Label htmlFor="name">Restaurant / Place Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="e.g., Sushi Masato"
                                                    required
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
                                        </div>
                                    </div>
                                )}

                                {/* LOCATION TAB */}
                                {activeTab === "location" && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="googleMapsUrl"
                                                    value={googleMapsUrl}
                                                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                                    placeholder="https://maps.google.com/..."
                                                    type="url"
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleAutofill}
                                                    disabled={isAutofilling || !googleMapsUrl}
                                                >
                                                    {isAutofilling ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        "Auto-fill"
                                                    )}
                                                </Button>
                                            </div>
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
                                            onChange={setItemsOrdered}
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
    )
}

export default FoodAddDialog
