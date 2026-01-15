"use client"

import { useState, useEffect } from "react"
import { MusicEntry, MusicEntryInsert } from "@/lib/database.types"
import { createMusicEntry, updateMusicEntry, deleteMusicEntry } from "@/lib/music-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Upload, Music } from "lucide-react"
import { format } from "date-fns/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    MUSIC_TYPE_OPTIONS,
    MUSIC_STATUS_OPTIONS,
    MUSIC_PLATFORM_OPTIONS,
} from "@/lib/music-types"
import { DetailsDialogLayout } from "@/components/shared/DetailsDialogLayout"
import { useFileUpload } from "@/hooks/useFileUpload"

interface MusicDetailsDialogProps {
    entry: MusicEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const TABS = [
    { id: "general", label: "General" },
    { id: "details", label: "Details & Notes" },
]

export function MusicDetailsDialog({
    entry,
    open,
    onOpenChange,
    onSuccess,
}: MusicDetailsDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<MusicEntryInsert>>({})
    const [activeTab, setActiveTab] = useState("general")

    const { fileInputRef, handleFileUpload, triggerFileInput } = useFileUpload({
        onSuccess: (url) => setFormData(prev => ({ ...prev, cover_url: url }))
    })

    useEffect(() => {
        if (entry) {
            setFormData({
                title: entry.title,
                artist: entry.artist,
                album: entry.album,
                type: entry.type,
                duration_minutes: entry.duration_minutes,
                status: entry.status,
                platform: entry.platform,
                price: entry.price,
                my_rating: entry.my_rating,
                listen_count: entry.listen_count,
                release_date: entry.release_date,
                notes: entry.notes,
                cover_url: entry.cover_url,
                spotify_id: entry.spotify_id,
                apple_music_id: entry.apple_music_id,
                genre: entry.genre,
            })
        } else {
            setFormData({
                status: "Listening",
                type: "Album",
                platform: "Spotify",
            })
        }
        setActiveTab("general")
    }, [entry, open])

    const handleSubmit = async () => {
        setLoading(true)

        try {
            if (!formData.title) {
                toast.error("Title is required")
                return
            }

            const dataToSave = { ...formData } as MusicEntryInsert

            if (entry) {
                const result = await updateMusicEntry(entry.id, dataToSave)
                if (!result.success) throw new Error(result.error)
                toast.success("Music updated")
            } else {
                const result = await createMusicEntry(dataToSave)
                if (!result.success) throw new Error(result.error)
                toast.success("Music added")
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Failed to save music")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!entry || !confirm("Are you sure you want to delete this music entry?")) return

        setLoading(true)
        try {
            const result = await deleteMusicEntry(entry.id)
            if (!result.success) throw new Error(result.error)
            toast.success("Music deleted")
            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Failed to delete music")
        } finally {
            setLoading(false)
        }
    }

    const isNewEntry = !entry

    return (
        <DetailsDialogLayout
            open={open}
            onOpenChange={onOpenChange}
            title={formData.title || "New Music"}
            subtitle={formData.artist ? (isNewEntry ? undefined : `by ${formData.artist}`) : undefined}
            isNewEntry={isNewEntry}
            entityTypeLabel="Music"
            placeholderIcon={<Music className="h-12 w-12" />}
            coverUrl={formData.cover_url}
            coverAspectRatio="square"
            onCoverUploadClick={triggerFileInput}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            loading={loading}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            showDelete={!!entry}
            submitLabel={entry ? "Save Changes" : "Add Music"}
        >
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, formData.title)}
            />

            {/* GENERAL TAB */}
            {activeTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-full">
                        <Label htmlFor="title">Title (Track/Album Name) <span className="text-red-500">*</span></Label>
                        <Input
                            id="title"
                            value={formData.title || ""}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="artist">Artist</Label>
                        <Input
                            id="artist"
                            value={formData.artist || ""}
                            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="album">Album</Label>
                        <Input
                            id="album"
                            value={formData.album || ""}
                            onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={formData.type || "Album"}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {MUSIC_TYPE_OPTIONS.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status || "Listening"}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {MUSIC_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                        <Input
                            id="duration_minutes"
                            type="number"
                            min="0"
                            value={formData.duration_minutes || ""}
                            onChange={(e) => {
                                const val = parseInt(e.target.value)
                                setFormData({ ...formData, duration_minutes: isNaN(val) ? null : val })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="my_rating">My Rating (0-10)</Label>
                        <Input
                            id="my_rating"
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={formData.my_rating || ""}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value)
                                setFormData({ ...formData, my_rating: isNaN(val) ? null : val })
                            }}
                        />
                    </div>

                    <div className="col-span-full space-y-2">
                        <Label>Cover URL</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.cover_url || ""}
                                onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                                className="flex-1"
                                placeholder="https://..."
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={triggerFileInput}
                                title="Upload new cover"
                            >
                                <Upload className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILS TAB */}
            {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Select
                            value={formData.platform || "Spotify"}
                            onValueChange={(value) => setFormData({ ...formData, platform: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                {MUSIC_PLATFORM_OPTIONS.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="listen_count">Listen Count</Label>
                        <Input
                            id="listen_count"
                            type="number"
                            min="0"
                            value={formData.listen_count || "0"}
                            onChange={(e) => {
                                const val = parseInt(e.target.value)
                                setFormData({ ...formData, listen_count: isNaN(val) ? null : val })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Release Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !formData.release_date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.release_date ? format(new Date(formData.release_date), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.release_date ? new Date(formData.release_date) : undefined}
                                    onSelect={(date) => setFormData({ ...formData, release_date: date ? format(date, "yyyy-MM-dd") : null })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price">Price (if purchased)</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price || ""}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value)
                                setFormData({ ...formData, price: isNaN(val) ? null : val })
                            }}
                        />
                    </div>

                    <div className="space-y-2 col-span-full">
                        <Label htmlFor="genre">Genre (Comma separated)</Label>
                        <Input
                            id="genre"
                            value={Array.isArray(formData.genre) ? formData.genre.join(", ") : ""}
                            onChange={(e) => setFormData({ ...formData, genre: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                            placeholder="Rock, Pop, Jazz"
                        />
                    </div>

                    <div className="space-y-2 col-span-full">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes || ""}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>
            )}
        </DetailsDialogLayout>
    )
}
