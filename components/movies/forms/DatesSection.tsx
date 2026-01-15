"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MediaEntryInsert } from "@/lib/database.types"

interface DatesSectionProps {
    formData: MediaEntryInsert
    setFormData: (data: MediaEntryInsert) => void
}

export function DatesSection({ formData, setFormData }: DatesSectionProps) {
    return (
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
    )
}
