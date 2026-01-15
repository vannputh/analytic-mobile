"use client"

import { useState, useEffect } from "react"
import { BookEntry, BookEntryInsert } from "@/lib/database.types"
import { createBookEntry, updateBookEntry, deleteBookEntry } from "@/lib/book-actions"
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
import { CalendarIcon, Upload, BookOpen } from "lucide-react"
import { format } from "date-fns/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    BOOK_FORMAT_OPTIONS,
    BOOK_STATUS_OPTIONS,
    BOOK_PLATFORM_OPTIONS,
} from "@/lib/book-types"
import { DetailsDialogLayout } from "@/components/shared/DetailsDialogLayout"
import { useFileUpload } from "@/hooks/useFileUpload"

interface BookDetailsDialogProps {
    entry: BookEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const TABS = [
    { id: "general", label: "General" },
    { id: "details", label: "Details" },
    { id: "dates", label: "Dates & Notes" },
]

export function BookDetailsDialog({
    entry,
    open,
    onOpenChange,
    onSuccess,
}: BookDetailsDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<BookEntryInsert>>({})
    const [activeTab, setActiveTab] = useState("general")

    const { fileInputRef, handleFileUpload, triggerFileInput } = useFileUpload({
        onSuccess: (url) => setFormData(prev => ({ ...prev, cover_url: url }))
    })

    useEffect(() => {
        if (entry) {
            setFormData({
                title: entry.title,
                author: entry.author,
                publisher: entry.publisher,
                isbn: entry.isbn,
                pages: entry.pages,
                format: entry.format,
                status: entry.status,
                platform: entry.platform,
                price: entry.price,
                my_rating: entry.my_rating,
                start_date: entry.start_date,
                finish_date: entry.finish_date,
                notes: entry.notes,
                cover_url: entry.cover_url,
                series_name: entry.series_name,
                series_number: entry.series_number,
                language: entry.language,
                genre: entry.genre,
            })
        } else {
            setFormData({
                status: "Plan to Read",
                format: "Physical",
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

            const dataToSave = { ...formData } as BookEntryInsert

            if (entry) {
                const result = await updateBookEntry(entry.id, dataToSave)
                if (!result.success) throw new Error(result.error)
                toast.success("Book updated")
            } else {
                const result = await createBookEntry(dataToSave)
                if (!result.success) throw new Error(result.error)
                toast.success("Book added")
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Failed to save book")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!entry || !confirm("Are you sure you want to delete this book?")) return

        setLoading(true)
        try {
            const result = await deleteBookEntry(entry.id)
            if (!result.success) throw new Error(result.error)
            toast.success("Book deleted")
            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Failed to delete book")
        } finally {
            setLoading(false)
        }
    }

    const isNewEntry = !entry

    return (
        <DetailsDialogLayout
            open={open}
            onOpenChange={onOpenChange}
            title={formData.title || "New Book"}
            subtitle={formData.author ? (isNewEntry ? undefined : `by ${formData.author}`) : undefined}
            isNewEntry={isNewEntry}
            entityTypeLabel="Book"
            placeholderIcon={<BookOpen className="h-12 w-12" />}
            coverUrl={formData.cover_url}
            coverAspectRatio="portrait"
            onCoverUploadClick={triggerFileInput}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            loading={loading}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            showDelete={!!entry}
            submitLabel={entry ? "Save Changes" : "Add Book"}
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
                        <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                        <Input
                            id="title"
                            value={formData.title || ""}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Book Title"
                            required
                        />
                    </div>

                    <div className="space-y-2 col-span-full">
                        <Label htmlFor="author">Author</Label>
                        <Input
                            id="author"
                            value={formData.author || ""}
                            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            placeholder="Author Name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status || "Plan to Read"}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {BOOK_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

                    <div className="space-y-2">
                        <Label htmlFor="format">Format</Label>
                        <Select
                            value={formData.format || "Physical"}
                            onValueChange={(value) => setFormData({ ...formData, format: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                {BOOK_FORMAT_OPTIONS.map((fmt) => (
                                    <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pages">Pages</Label>
                        <Input
                            id="pages"
                            type="number"
                            min="0"
                            value={formData.pages || ""}
                            onChange={(e) => {
                                const val = parseInt(e.target.value)
                                setFormData({ ...formData, pages: isNaN(val) ? null : val })
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
                        <Label htmlFor="series_name">Series Name</Label>
                        <Input
                            id="series_name"
                            value={formData.series_name || ""}
                            onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="series_number">Series #</Label>
                        <Input
                            id="series_number"
                            type="number"
                            value={formData.series_number || ""}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value)
                                setFormData({ ...formData, series_number: isNaN(val) ? null : val })
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="publisher">Publisher</Label>
                        <Input
                            id="publisher"
                            value={formData.publisher || ""}
                            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="isbn">ISBN</Label>
                        <Input
                            id="isbn"
                            value={formData.isbn || ""}
                            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="platform">Source/Platform</Label>
                        <Select
                            value={formData.platform || "Physical"}
                            onValueChange={(value) => setFormData({ ...formData, platform: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                {BOOK_PLATFORM_OPTIONS.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
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
                            placeholder="Fiction, Sci-Fi, Mystery"
                        />
                    </div>
                </div>
            )}

            {/* DATES TAB */}
            {activeTab === "dates" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !formData.start_date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.start_date ? format(new Date(formData.start_date), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                                    onSelect={(date) => setFormData({ ...formData, start_date: date ? format(date, "yyyy-MM-dd") : null })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Finish Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !formData.finish_date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.finish_date ? format(new Date(formData.finish_date), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={formData.finish_date ? new Date(formData.finish_date) : undefined}
                                    onSelect={(date) => setFormData({ ...formData, finish_date: date ? format(date, "yyyy-MM-dd") : null })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
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
