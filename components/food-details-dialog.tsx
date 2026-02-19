"use client"

import { useState, useEffect } from "react"
import { deleteFoodEntry, getFoodEntry } from "@/lib/food-actions"
import { FoodEntry, FoodEntryImage } from "@/lib/database.types"
import { FoodGallery } from "./food-gallery"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    MapPin,
    Trash2,
    Edit2,
    Instagram,
    Globe,
    Utensils,
    Copy,
    Loader2,
    ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StarRatingDisplay } from "@/components/form-inputs"
import { toast } from "sonner"
import { formatDualCurrency, formatRestaurantDisplayName, DINING_OPTIONS } from "@/lib/food-types"
import Image from "next/image"

interface FoodDetailsDialogProps {
    entry: FoodEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit: (entry: FoodEntry) => void
    /** Open add dialog with this entry as template (same place, new visit / "Log again"). */
    onDuplicate?: (entry: FoodEntry) => void
    onDelete: (id: string) => void
}

export function FoodDetailsDialog({
    entry,
    open,
    onOpenChange,
    onEdit,
    onDuplicate,
    onDelete,
}: FoodDetailsDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [fullEntry, setFullEntry] = useState<(FoodEntry & { images: FoodEntryImage[] }) | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"overview" | "details" | "notes">("overview")

    // Fetch full entry details (with images) when dialog opens
    useEffect(() => {
        async function fetchDetails() {
            if (!entry?.id || !open) return

            setIsLoading(true)
            const result = await getFoodEntry(entry.id)
            if (result.success) {
                setFullEntry(result.data)
            }
            setIsLoading(false)
        }

        if (open && entry) {
            fetchDetails()
            setActiveTab("overview")
        }
    }, [entry?.id, open])

    // Update fullEntry if entry prop changes (e.g. after edit)
    useEffect(() => {
        if (entry) {
            setFullEntry(prev => prev?.id === entry.id ? { ...prev, ...entry } : null)
        }
    }, [entry])

    if (!entry) return null

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true)
    }

    const handleDeleteConfirm = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteFoodEntry(entry.id)
            if (result.success) {
                toast.success("Entry deleted")
                onDelete(entry.id)
                setShowDeleteConfirm(false)
                onOpenChange(false)
            } else {
                toast.error(result.error || "Failed to delete entry")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsDeleting(false)
        }
    }

    const copyAddress = () => {
        if (entry.address) {
            navigator.clipboard.writeText(entry.address)
            toast.success("Address copied")
        }
    }

    const copyMapsUrl = () => {
        if (entry.google_maps_url) {
            navigator.clipboard.writeText(entry.google_maps_url)
            toast.success("Link copied")
        }
    }

    // Calculate total from items if available
    const itemsTotal = entry.items_ordered && Array.isArray(entry.items_ordered)
        ? entry.items_ordered.reduce((sum, item) => sum + (item.price || 0), 0)
        : 0

    const images = fullEntry?.images || []
    const hasImages = images.length > 0 || entry.primary_image_url

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 h-[90vh] md:h-[85vh] flex flex-col gap-0 overflow-hidden">
                <ScrollArea className="flex-1">
                    {/* Hero Photo Section - Full Width at Top */}
                    <div className="relative">
                        {hasImages ? (
                            <div className="w-full">
                                <FoodGallery
                                    images={images.length > 0
                                        ? images.map(img => ({ url: img.image_url, alt: formatRestaurantDisplayName(entry) }))
                                        : [{ url: entry.primary_image_url!, alt: formatRestaurantDisplayName(entry) }]
                                    }
                                    className="rounded-none [&>div:first-child]:rounded-none [&>div:first-child]:aspect-[16/9] md:[&>div:first-child]:aspect-[21/9]"
                                />
                            </div>
                        ) : (
                            <div className="aspect-[16/9] md:aspect-[21/9] w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <ImageIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No photos available</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Header with Title */}
                    <div className="px-6 py-4 border-b bg-background sticky top-0 z-10">
                        <DialogHeader>
                            <DialogTitle className="text-xl md:text-2xl truncate" title={formatRestaurantDisplayName(entry)}>
                                {formatRestaurantDisplayName(entry)}
                            </DialogTitle>
                            <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                                {entry.category && (
                                    <Badge variant="outline" className="text-xs">
                                        <Utensils className="h-3 w-3 mr-1" />
                                        {entry.category}
                                    </Badge>
                                )}
                                {entry.dining_type && (
                                    <Badge variant="outline" className="text-xs">
                                        {DINING_OPTIONS.find((o) => o.value === entry.dining_type)?.label ?? entry.dining_type}
                                    </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                    {new Date(entry.visit_date + "T00:00:00").toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </span>
                            </DialogDescription>
                        </DialogHeader>

                        {/* Tabs */}
                        <div className="flex gap-1 mt-4 overflow-x-auto">
                            {(["overview", "details", "notes"] as const).map(tab => (
                                <Button
                                    key={tab}
                                    variant={activeTab === tab ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "h-8 text-sm flex-shrink-0 capitalize",
                                        activeTab === tab && "bg-secondary font-medium"
                                    )}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 md:p-6">
                        {/* OVERVIEW TAB */}
                        {activeTab === "overview" && (
                            <div className="space-y-6">
                                {/* Cuisine Types & Tags */}
                                {(entry.cuisine_type?.length || entry.tags?.length) && (
                                    <div className="space-y-3">
                                        {/* Cuisine Types */}
                                        {entry.cuisine_type && Array.isArray(entry.cuisine_type) && entry.cuisine_type.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {entry.cuisine_type.map((cuisine) => (
                                                    <Badge key={cuisine} variant="secondary">
                                                        {cuisine}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {entry.tags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Ratings Section */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                        Ratings
                                    </h4>
                                    <div className="space-y-0.5 bg-muted/30 rounded-lg p-4">
                                        {entry.overall_rating != null && (
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-muted-foreground">Overall</span>
                                                <StarRatingDisplay rating={entry.overall_rating} size="md" showValue />
                                            </div>
                                        )}
                                        {entry.food_rating != null && (
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-muted-foreground">Food</span>
                                                <StarRatingDisplay rating={entry.food_rating} size="md" showValue />
                                            </div>
                                        )}
                                        {entry.ambiance_rating != null && (
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-muted-foreground">Ambiance</span>
                                                <StarRatingDisplay rating={entry.ambiance_rating} size="md" showValue />
                                            </div>
                                        )}
                                        {entry.service_rating != null && (
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-muted-foreground">Service</span>
                                                <StarRatingDisplay rating={entry.service_rating} size="md" showValue />
                                            </div>
                                        )}
                                        {entry.value_rating != null && (
                                            <div className="flex items-center justify-between py-1.5">
                                                <span className="text-sm text-muted-foreground">Value</span>
                                                <StarRatingDisplay rating={entry.value_rating} size="md" showValue />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Price Section */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <span className="text-sm text-muted-foreground">Total</span>
                                        <p className="text-lg font-semibold font-mono">
                                            {formatDualCurrency(entry.total_price || itemsTotal)}
                                        </p>
                                    </div>
                                    {entry.price_level && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">Price Level</span>
                                            <p className="text-lg font-semibold">{entry.price_level}</p>
                                        </div>
                                    )}
                                </div>

                                {entry.would_return !== null && entry.would_return !== undefined && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Would go back</span>
                                        <Badge variant={entry.would_return ? "default" : "secondary"}>
                                            {entry.would_return ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DETAILS TAB */}
                        {activeTab === "details" && (
                            <div className="space-y-6">
                                {/* Location Section */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                        Location
                                    </h4>

                                    {(entry.neighborhood || entry.city) && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <p className="text-sm">
                                                {[entry.neighborhood, entry.city, entry.country].filter(Boolean).join(", ")}
                                            </p>
                                        </div>
                                    )}

                                    {entry.address && (
                                        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                                            <div className="flex-1 text-sm text-muted-foreground">
                                                {entry.address}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyAddress}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* External Links */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {entry.google_maps_url && (
                                            <>
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={entry.google_maps_url} target="_blank" rel="noopener noreferrer">
                                                        <MapPin className="h-4 w-4 mr-2" />
                                                        Google Maps
                                                    </a>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyMapsUrl} title="Copy link">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        {entry.instagram_handle && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a
                                                    href={`https://instagram.com/${entry.instagram_handle.replace("@", "")}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Instagram className="h-4 w-4 mr-2" />
                                                    {entry.instagram_handle}
                                                </a>
                                            </Button>
                                        )}
                                        {entry.website_url && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={entry.website_url} target="_blank" rel="noopener noreferrer">
                                                    <Globe className="h-4 w-4 mr-2" />
                                                    Website
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Items Ordered */}
                                {entry.items_ordered && Array.isArray(entry.items_ordered) && entry.items_ordered.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                                Items Ordered
                                            </h4>
                                            <ul className="space-y-3">
                                                {entry.items_ordered.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                                                        {item.image_url && (
                                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
                                                                <Image
                                                                    src={item.image_url}
                                                                    alt={item.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={cn(
                                                                    "text-sm truncate",
                                                                    item.name === entry.favorite_item && "font-medium text-amber-600"
                                                                )}>
                                                                    {item.name}
                                                                    {item.name === entry.favorite_item && " ⭐"}
                                                                </span>
                                                                <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                                                                    {formatDualCurrency(item.price)}
                                                                </span>
                                                            </div>
                                                            {/* Item Categories */}
                                                            {(item.categories?.length || item.category) && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {(item.categories || [item.category]).filter(Boolean).map((cat, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-[10px] px-1 h-4">
                                                                            {cat}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* NOTES TAB */}
                        {activeTab === "notes" && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    Notes
                                </h4>
                                {entry.notes ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <p className="whitespace-pre-wrap">{entry.notes}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <DialogFooter className="border-t p-4 flex flex-wrap items-center justify-between gap-2 bg-muted/20 shrink-0 w-full z-10">
                    <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:hover:bg-red-950 dark:text-red-400"
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                    </Button>
                    <div className="flex gap-2">
                        {onDuplicate && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    onDuplicate(entry)
                                    onOpenChange(false)
                                }}
                            >
                                Log again
                            </Button>
                        )}
                        <Button
                            variant="default"
                            onClick={() => onEdit(entry)}
                        >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete entry?</DialogTitle>
                    <DialogDescription>
                        This will permanently remove &quot;{formatRestaurantDisplayName(entry)}&quot; from your food log. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Delete"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
    )
}

export default FoodDetailsDialog
