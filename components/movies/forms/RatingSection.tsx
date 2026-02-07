"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MediaEntryInsert } from "@/lib/database.types"

interface RatingSectionProps {
    formData: MediaEntryInsert
    setFormData: (data: MediaEntryInsert) => void
}

export function RatingSection({ formData, setFormData }: RatingSectionProps) {
    return (
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
                    value={formData.my_rating ?? ""}
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
                    value={formData.average_rating ?? ""}
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
    )
}
