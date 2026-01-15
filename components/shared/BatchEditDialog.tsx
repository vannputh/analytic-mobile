"use client"

import { useState } from "react"
import { MediaEntry } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { TYPE_OPTIONS, STATUS_OPTIONS, MEDIUM_OPTIONS } from "@/lib/types"
import { normalizeLanguage } from "@/lib/language-utils"

interface BatchEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedEntries: MediaEntry[]
    onSuccess?: () => void
}

export function BatchEditDialog({
    open,
    onOpenChange,
    selectedEntries,
    onSuccess,
}: BatchEditDialogProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        type: "",
        status: "",
        medium: "",
        price: "",
        language: "",
        episodes: "",
        genre: "",
    })

    const resetForm = () => {
        setFormData({
            type: "",
            status: "",
            medium: "",
            price: "",
            language: "",
            episodes: "",
            genre: "",
        })
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!isEditing) {
            onOpenChange(newOpen)
            if (!newOpen) resetForm()
        }
    }

    const handleSubmit = async () => {
        if (selectedEntries.length === 0) {
            toast.error("Please select entries to edit")
            return
        }

        const updateData: Partial<MediaEntry> = {}
        if (formData.type && formData.type !== "no-change") updateData.type = formData.type
        if (formData.status && formData.status !== "no-change") updateData.status = formData.status
        if (formData.medium && formData.medium !== "no-change") updateData.medium = formData.medium

        if (formData.price !== "" && formData.price !== "no-change") {
            const priceValue = parseFloat(formData.price)
            if (!isNaN(priceValue) && priceValue >= 0) {
                updateData.price = priceValue
            }
        }

        if (formData.language !== "" && formData.language !== "no-change") {
            const languages = normalizeLanguage(formData.language)
            updateData.language = languages.length > 0 ? languages : null
        }

        if (formData.episodes !== "" && formData.episodes !== "no-change") {
            const episodesValue = parseInt(formData.episodes)
            if (!isNaN(episodesValue) && episodesValue >= 0) {
                updateData.episodes = episodesValue
            }
        }

        let genresToAdd: string[] = []
        if (formData.genre && formData.genre.trim() !== "") {
            genresToAdd = formData.genre
                .split(",")
                .map((g) => g.trim())
                .filter((g) => g.length > 0)
        }

        const hasGenreUpdate = genresToAdd.length > 0
        const hasOtherUpdates = Object.keys(updateData).length > 0

        if (!hasGenreUpdate && !hasOtherUpdates) {
            toast.error("Please select at least one field to update")
            return
        }

        setIsEditing(true)
        try {
            if (hasGenreUpdate) {
                let successCount = 0
                let failedCount = 0

                for (const entry of selectedEntries) {
                    try {
                        const currentGenres = Array.isArray(entry.genre)
                            ? entry.genre.map((g) => g.trim()).filter((g) => g.length > 0)
                            : []

                        const existingGenreMap = new Map<string, string>()
                        currentGenres.forEach((g) => {
                            existingGenreMap.set(g.toLowerCase(), g)
                        })

                        const mergedGenres = [...currentGenres]
                        genresToAdd.forEach((newGenre) => {
                            const normalized = newGenre.toLowerCase()
                            if (!existingGenreMap.has(normalized)) {
                                mergedGenres.push(newGenre)
                                existingGenreMap.set(normalized, newGenre)
                            }
                        })

                        const entryUpdateData: Partial<MediaEntry> = { ...updateData, genre: mergedGenres }

                        const { error } = await (supabase
                            .from("media_entries" as any) as any)
                            .update(entryUpdateData)
                            .eq("id", entry.id)

                        if (error) throw error
                        successCount++
                    } catch (err) {
                        console.error(`Failed to update entry ${entry.id}:`, err)
                        failedCount++
                    }
                }

                if (successCount > 0) {
                    toast.success(`Updated ${successCount} entries${failedCount > 0 ? `, ${failedCount} failed` : ""}`)
                }
                if (failedCount > 0 && successCount === 0) {
                    toast.error(`Failed to update ${failedCount} entries`)
                }
            } else {
                const { error } = await (supabase
                    .from("media_entries" as any) as any)
                    .update(updateData)
                    .in("id", selectedEntries.map(e => e.id))

                if (error) throw error
                toast.success(`Updated ${selectedEntries.length} entries`)
            }

            resetForm()
            onSuccess?.()

            setTimeout(() => {
                onOpenChange(false)
                setIsEditing(false)
            }, 100)
        } catch (error) {
            console.error("Batch edit error:", error)
            toast.error("Failed to update entries")
            setIsEditing(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
                    <DialogTitle className="text-xl">Batch Edit {selectedEntries.length} Entries</DialogTitle>
                    <DialogDescription>
                        Update the selected fields for all selected entries. Leave fields empty or select &quot;Keep current&quot; to preserve existing values.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 min-h-0">
                    <div className="space-y-6 py-4">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="batch-type">Type</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                                            disabled={isEditing}
                                        >
                                            <SelectTrigger id="batch-type">
                                                <SelectValue placeholder="Keep current" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="no-change">Keep current</SelectItem>
                                                {TYPE_OPTIONS.map((t) => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="batch-status">Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                            disabled={isEditing}
                                        >
                                            <SelectTrigger id="batch-status">
                                                <SelectValue placeholder="Keep current" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="no-change">Keep current</SelectItem>
                                                {STATUS_OPTIONS.map((s) => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="batch-medium">Medium</Label>
                                        <Select
                                            value={formData.medium}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, medium: value }))}
                                            disabled={isEditing}
                                        >
                                            <SelectTrigger id="batch-medium">
                                                <SelectValue placeholder="Keep current" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="no-change">Keep current</SelectItem>
                                                {MEDIUM_OPTIONS.map((m) => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Details Section */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold mb-3">Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="batch-price">Price</Label>
                                        <Input
                                            id="batch-price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Keep current (leave empty)"
                                            value={formData.price}
                                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                            disabled={isEditing}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="batch-episodes">Number of Episodes</Label>
                                        <Input
                                            id="batch-episodes"
                                            type="number"
                                            min="0"
                                            placeholder="Keep current (leave empty)"
                                            value={formData.episodes}
                                            onChange={(e) => setFormData(prev => ({ ...prev, episodes: e.target.value }))}
                                            disabled={isEditing}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="batch-language">Language</Label>
                                        <Input
                                            id="batch-language"
                                            type="text"
                                            placeholder="Comma-separated (e.g., English, Spanish) - leave empty to keep current"
                                            value={formData.language}
                                            onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                                            disabled={isEditing}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Separate multiple languages with commas
                                        </p>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="batch-genre">Genre</Label>
                                        <Input
                                            id="batch-genre"
                                            type="text"
                                            placeholder="Comma-separated (e.g., Action, Drama) - leave empty to keep current"
                                            value={formData.genre}
                                            onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                                            disabled={isEditing}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Genres will be added to existing genres, not replaced
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isEditing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isEditing}
                    >
                        {isEditing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            `Update ${selectedEntries.length} Entries`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
