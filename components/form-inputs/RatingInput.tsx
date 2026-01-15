"use client"

import { Star, X } from "lucide-react"
import { Label } from "@/components/ui/label"

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
    // Handle click to set rating - left half of star = full star, right half = half star
    const handleStarClick = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const isRightHalf = clickX > rect.width / 2

        const newValue = isRightHalf ? starIndex + 0.5 : starIndex + 1

        // If clicking the same value, toggle it off
        if (value === newValue) {
            onChange(null)
        } else {
            onChange(newValue)
        }
    }

    // Determine star fill for each star position
    const getStarFill = (starIndex: number): 'full' | 'half' | 'empty' => {
        if (value === null) return 'empty'
        if (value >= starIndex + 1) return 'full'
        if (value >= starIndex + 0.5) return 'half'
        return 'empty'
    }

    return (
        <div className="flex items-center justify-between">
            {showLabel && <Label className="text-sm">{label}</Label>}
            <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => {
                    const fill = getStarFill(i)
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={(e) => handleStarClick(i, e)}
                            className="p-0.5 relative"
                        >
                            {/* Background empty star */}
                            <Star className="h-5 w-5 text-muted-foreground/30" />
                            {/* Filled overlay */}
                            {fill !== 'empty' && (
                                <div
                                    className="absolute inset-0 overflow-hidden p-0.5"
                                    style={{ width: fill === 'half' ? '50%' : '100%' }}
                                >
                                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                </div>
                            )}
                        </button>
                    )
                })}
                {value !== null && (
                    <span className="ml-1 text-xs font-mono text-muted-foreground">
                        {value}
                    </span>
                )}
                {value !== null && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="ml-1 p-1 rounded-full hover:bg-muted"
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
            </div>
        </div>
    )
}

export default RatingInput
