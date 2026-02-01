"use client"

import { Star, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export interface RatingInputProps {
    label: string
    value: number | null
    onChange: (value: number | null) => void
    showLabel?: boolean
}

export function RatingInput({
    label,
    value,
    onChange,
    showLabel = true,
}: RatingInputProps) {
    const [hoverValue, setHoverValue] = useState<number | null>(null)

    // Handle click to set rating - left half = half star, right half = full star
    const handleStarClick = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const isLeftHalf = clickX < rect.width / 2

        const newValue = isLeftHalf ? starIndex + 0.5 : starIndex + 1

        // If clicking the same value, toggle it off
        if (value === newValue) {
            onChange(null)
        } else {
            onChange(newValue)
        }
    }

    // Handle hover to preview rating
    const handleStarHover = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const hoverX = e.clientX - rect.left
        const isLeftHalf = hoverX < rect.width / 2

        const previewValue = isLeftHalf ? starIndex + 0.5 : starIndex + 1
        setHoverValue(previewValue)
    }

    // Determine star fill for each star position
    const getStarFill = (starIndex: number): 'full' | 'half' | 'empty' => {
        const displayValue = hoverValue !== null ? hoverValue : value
        if (displayValue === null) return 'empty'
        if (displayValue >= starIndex + 1) return 'full'
        if (displayValue >= starIndex + 0.5) return 'half'
        return 'empty'
    }

    return (
        <div className="flex items-center justify-between">
            {showLabel && <Label className="text-sm">{label}</Label>}
            <div
                className="flex items-center gap-0.5"
                onMouseLeave={() => setHoverValue(null)}
            >
                {Array.from({ length: 5 }).map((_, i) => {
                    const fill = getStarFill(i)
                    const isHovering = hoverValue !== null
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={(e) => handleStarClick(i, e)}
                            onMouseMove={(e) => handleStarHover(i, e)}
                            className="p-1 relative group"
                        >
                            {/* Background empty star - larger size */}
                            <Star className="h-6 w-6 text-muted-foreground/30 transition-all" />

                            {/* Hover divider line to show half/full boundary */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="w-px h-4 bg-border" />
                            </div>

                            {/* Filled overlay */}
                            {fill !== 'empty' && (
                                <div
                                    className="absolute inset-0 overflow-hidden p-1 transition-all"
                                    style={{ width: fill === 'half' ? '50%' : '100%' }}
                                >
                                    <Star
                                        className={`h-6 w-6 fill-amber-400 text-amber-400 transition-opacity ${isHovering ? 'opacity-60' : 'opacity-100'
                                            }`}
                                    />
                                </div>
                            )}
                        </button>
                    )
                })}
                {value !== null && (
                    <span className="ml-1 text-xs font-mono text-muted-foreground min-w-[2ch]">
                        {value}
                    </span>
                )}
                {value !== null && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="ml-1 p-1 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
            </div>
        </div>
    )
}

export default RatingInput
