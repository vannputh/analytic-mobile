"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MediaEntryInsert } from "@/lib/database.types"

interface MediaDetailsSectionProps {
    formData: MediaEntryInsert
    setFormData: (data: MediaEntryInsert) => void
    dropdownOptions: {
        platforms: string[]
    }
    setDropdownOptions: React.Dispatch<React.SetStateAction<{
        platforms: string[]
    }>>
    showNewInput: Record<string, boolean>
    setShowNewInput: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    newValue: Record<string, string>
    setNewValue: React.Dispatch<React.SetStateAction<Record<string, string>>>
    detectISBN: (val: string) => string | null
}

export function MediaDetailsSection({
    formData,
    setFormData,
    dropdownOptions,
    setDropdownOptions,
    showNewInput,
    setShowNewInput,
    newValue,
    setNewValue,
    detectISBN
}: MediaDetailsSectionProps) {

    const handleNewInputBlur = (field: "platform", pluralField: "platforms") => {
        if (newValue[field].trim()) {
            const trimmedValue = newValue[field].trim()
            setFormData({ ...formData, [field]: trimmedValue })
            setDropdownOptions(prev => {
                // Only add if not already present
                // Use 'any' to bypass TS strict check on dynamic prop access if needed,
                // or ensure DropdownOptions interface is strictly typed.
                // For simplicity here, we assume it works or cast as needed.
                const currentList = (prev as any)[pluralField] as string[]
                if (currentList.includes(trimmedValue)) return prev
                return {
                    ...prev,
                    [pluralField]: [...currentList, trimmedValue]
                }
            })
            setShowNewInput({ ...showNewInput, [field]: false })
            setNewValue({ ...newValue, [field]: "" })
        } else {
            setShowNewInput({ ...showNewInput, [field]: false })
        }
    }

    const handleNewInputKeyDown = (e: React.KeyboardEvent, field: "platform", pluralField: "platforms") => {
        if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur()
        }
    }

    return (
        <>
            {/* Platform, Episodes, Length */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="platform" className="text-sm font-mono">Platform</Label>
                    {showNewInput.platform ? (
                        <Input
                            id="platform"
                            value={newValue.platform}
                            onChange={(e) => setNewValue({ ...newValue, platform: e.target.value })}
                            placeholder="Enter new platform"
                            onBlur={() => handleNewInputBlur("platform", "platforms")}
                            onKeyDown={(e) => handleNewInputKeyDown(e, "platform", "platforms")}
                            autoFocus
                        />
                    ) : (
                        <Select
                            value={formData.platform || "__none__"}
                            onValueChange={(value) => {
                                if (value === "__new__") {
                                    setShowNewInput({ ...showNewInput, platform: true })
                                } else {
                                    setFormData({ ...formData, platform: value === "__none__" ? null : value })
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {dropdownOptions.platforms.map((platform) => (
                                    <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                                ))}
                                <SelectItem value="__new__">+ New</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="episodes" className="text-sm font-mono">Episodes</Label>
                    <Input
                        id="episodes"
                        type="number"
                        value={formData.episodes || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                episodes: e.target.value ? parseInt(e.target.value) : null,
                            })
                        }
                        placeholder="Number of episodes"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="length" className="text-sm font-mono">Length</Label>
                    <Input
                        id="length"
                        value={formData.length || ""}
                        onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                        placeholder="e.g., 120 min, 300 pages"
                    />
                </div>
            </div>

            {/* Price and IDs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-mono">Price</Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                price: e.target.value ? parseFloat(e.target.value) : null,
                            })
                        }
                        placeholder="0.00"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="imdb_id" className="text-sm font-mono">IMDb ID / ISBN</Label>
                    <Input
                        id="imdb_id"
                        value={formData.imdb_id || ""}
                        onChange={(e) => {
                            const value = e.target.value
                            const isbn = detectISBN(value)

                            // Auto-set medium to "Book" if ISBN is detected
                            if (isbn) {
                                setFormData({ ...formData, imdb_id: value, medium: "Book" })
                            } else {
                                setFormData({ ...formData, imdb_id: value })
                            }
                        }}
                        placeholder="tt1234567 or 9780123456789"
                    />
                </div>
            </div>
        </>
    )
}
