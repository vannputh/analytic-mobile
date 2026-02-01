"use client"

import { useRef } from "react"
import { FoodEntry } from "@/lib/database.types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MapPin, DollarSign, Edit2, ExternalLink, Instagram } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDualCurrency, formatRestaurantDisplayName } from "@/lib/food-types"
import Image from "next/image"

const CLICK_DELAY_MS = 250

interface FoodEntryCardProps {
    entry: FoodEntry
    onClick: () => void
    onEdit?: () => void
    compact?: boolean
}

function RatingStars({ rating, max = 5 }: { rating: number | null; max?: number }) {
    if (rating === null || rating === undefined) return null

    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: max }).map((_, i) => (
                <Star
                    key={i}
                    className={cn(
                        "h-3 w-3",
                        i < Math.floor(rating)
                            ? "fill-amber-400 text-amber-400"
                            : i < rating
                                ? "fill-amber-400/50 text-amber-400"
                                : "text-muted-foreground/30"
                    )}
                />
            ))}
            <span className="ml-1 text-xs font-mono text-muted-foreground">
                {rating.toFixed(1)}
            </span>
        </div>
    )
}

function PriceLevel({ level }: { level: string | null }) {
    if (!level) return null

    const dollarCount = level.length
    return (
        <div className="flex items-center text-muted-foreground">
            {Array.from({ length: 4 }).map((_, i) => (
                <DollarSign
                    key={i}
                    className={cn(
                        "h-3 w-3 -ml-1 first:ml-0",
                        i < dollarCount ? "text-green-600" : "text-muted-foreground/20"
                    )}
                />
            ))}
        </div>
    )
}

export function FoodEntryCard({ entry, onClick, onEdit, compact = false }: FoodEntryCardProps) {
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleClick = () => {
        if (clickTimeoutRef.current) return // part of a double-click, ignore
        clickTimeoutRef.current = setTimeout(() => {
            clickTimeoutRef.current = null
            onClick()
        }, CLICK_DELAY_MS)
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current)
            clickTimeoutRef.current = null
        }
        e.preventDefault()
        onEdit?.()
    }

    return (
        <Card
            className={cn(
                "group cursor-pointer transition-all hover:shadow-md hover:border-primary/50 overflow-hidden",
                compact && "border-0 shadow-none"
            )}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            <CardContent className={cn("p-0 full-height flex flex-col h-full")}>
                {/* Image Section */}
                {entry.primary_image_url && !compact && (
                    <div className="relative w-full h-32 bg-muted/20">
                        <Image
                            src={entry.primary_image_url}
                            alt={formatRestaurantDisplayName(entry)}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                            <h4 className="font-medium text-white text-sm truncate shadow-sm">
                                {formatRestaurantDisplayName(entry)}
                            </h4>
                        </div>
                    </div>
                )}

                <div className={cn("p-3 flex-1 flex flex-col gap-2", compact && "p-2")}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            {/* Name (if no image or compact) */}
                            {(!entry.primary_image_url || compact) && (
                                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                    {formatRestaurantDisplayName(entry)}
                                </h4>
                            )}

                            {/* Location */}
                            {(entry.neighborhood || entry.city) && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">
                                        {[entry.neighborhood, entry.city].filter(Boolean).join(", ")}
                                    </span>
                                </div>
                            )}

                            {/* Cuisine Types */}
                            {entry.cuisine_type && Array.isArray(entry.cuisine_type) && entry.cuisine_type.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {entry.cuisine_type.slice(0, 3).map((cuisine) => (
                                        <Badge key={cuisine} variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {cuisine}
                                        </Badge>
                                    ))}
                                    {entry.cuisine_type.length > 3 && (
                                        <span className="text-[10px] text-muted-foreground">
                                            +{entry.cuisine_type.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right side: Rating & Price */}
                        <div className="flex flex-col items-end gap-1">
                            <RatingStars rating={entry.overall_rating} />
                            <PriceLevel level={entry.price_level} />
                        </div>
                    </div>

                    {/* Meal type and tags */}
                    {!compact && (
                        <div className="flex items-center justify-between mt-auto pt-2 border-t">
                            <div className="flex items-center gap-2">
                                {entry.category && (
                                    <span className="text-xs text-muted-foreground">
                                        {entry.category}
                                    </span>
                                )}
                                {entry.total_price && (
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {formatDualCurrency(entry.total_price)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {entry.instagram_handle && (
                                    <a
                                        href={`https://instagram.com/${entry.instagram_handle.replace("@", "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 rounded hover:bg-muted transition-colors"
                                    >
                                        <Instagram className="h-3.5 w-3.5 text-muted-foreground hover:text-pink-500" />
                                    </a>
                                )}
                                {entry.google_maps_url && (
                                    <a
                                        href={entry.google_maps_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 rounded hover:bg-muted transition-colors"
                                    >
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground hover:text-blue-500" />
                                    </a>
                                )}
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit()
                                        }}
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default FoodEntryCard
