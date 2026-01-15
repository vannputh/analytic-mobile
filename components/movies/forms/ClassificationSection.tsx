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

interface ClassificationSectionProps {
    formData: MediaEntryInsert
    setFormData: (data: MediaEntryInsert) => void
    dropdownOptions: {
        mediums: string[]
        statuses: string[]
        types: string[]
        platforms: string[]
    }
    setDropdownOptions: React.Dispatch<React.SetStateAction<{
        mediums: string[]
        statuses: string[]
        types: string[]
        platforms: string[]
    }>>
    showNewInput: Record<string, boolean>
    setShowNewInput: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    newValue: Record<string, string>
    setNewValue: React.Dispatch<React.SetStateAction<Record<string, string>>>
    genreInput: string
    handleGenreChange: (val: string) => void
    languageInput: string
    handleLanguageChange: (val: string) => void
}

export function ClassificationSection({
    formData,
    setFormData,
    dropdownOptions,
    setDropdownOptions,
    showNewInput,
    setShowNewInput,
    newValue,
    setNewValue,
    genreInput,
    handleGenreChange,
    languageInput,
    handleLanguageChange,
}: ClassificationSectionProps) {

    const handleNewInputBlur = (field: "medium" | "status" | "type", pluralField: "mediums" | "statuses" | "types") => {
        if (newValue[field].trim()) {
            const trimmedValue = newValue[field].trim()
            setFormData({ ...formData, [field]: trimmedValue })
            setDropdownOptions(prev => ({
                ...prev,
                [pluralField]: prev[pluralField].includes(trimmedValue) ? prev[pluralField] : [...prev[pluralField], trimmedValue]
            }))
            setShowNewInput({ ...showNewInput, [field]: false })
            setNewValue({ ...newValue, [field]: "" })
        } else {
            setShowNewInput({ ...showNewInput, [field]: false })
        }
    }

    const handleNewInputKeyDown = (e: React.KeyboardEvent, field: "medium" | "status" | "type", pluralField: "mediums" | "statuses" | "types") => {
        if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur()
        }
    }

    return (
        <>
            {/* Medium and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="medium" className="text-sm font-mono">Medium</Label>
                    {showNewInput.medium ? (
                        <Input
                            id="medium"
                            value={newValue.medium}
                            onChange={(e) => setNewValue({ ...newValue, medium: e.target.value })}
                            placeholder="Enter new medium"
                            onBlur={() => handleNewInputBlur("medium", "mediums")}
                            onKeyDown={(e) => handleNewInputKeyDown(e, "medium", "mediums")}
                            autoFocus
                        />
                    ) : (
                        <Select
                            value={formData.medium || "__none__"}
                            onValueChange={(value) => {
                                if (value === "__new__") {
                                    setShowNewInput({ ...showNewInput, medium: true })
                                } else {
                                    setFormData({ ...formData, medium: value === "__none__" ? null : value })
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select medium" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {dropdownOptions.mediums.map((medium) => (
                                    <SelectItem key={medium} value={medium}>{medium}</SelectItem>
                                ))}
                                <SelectItem value="__new__">+ New</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-mono">Status</Label>
                    {showNewInput.status ? (
                        <Input
                            id="status"
                            value={newValue.status}
                            onChange={(e) => setNewValue({ ...newValue, status: e.target.value })}
                            placeholder="Enter new status"
                            onBlur={() => handleNewInputBlur("status", "statuses")}
                            onKeyDown={(e) => handleNewInputKeyDown(e, "status", "statuses")}
                            autoFocus
                        />
                    ) : (
                        <Select
                            value={formData.status || "__none__"}
                            onValueChange={(value) => {
                                if (value === "__new__") {
                                    setShowNewInput({ ...showNewInput, status: true })
                                } else {
                                    setFormData({ ...formData, status: value === "__none__" ? null : value })
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {dropdownOptions.statuses.map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                                <SelectItem value="__new__">+ New</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Type, Season, Language */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-mono">Type</Label>
                    {showNewInput.type ? (
                        <Input
                            id="type"
                            value={newValue.type}
                            onChange={(e) => setNewValue({ ...newValue, type: e.target.value })}
                            placeholder="Enter new type"
                            onBlur={() => handleNewInputBlur("type", "types")}
                            onKeyDown={(e) => handleNewInputKeyDown(e, "type", "types")}
                            autoFocus
                        />
                    ) : (
                        <Select
                            value={formData.type || "__none__"}
                            onValueChange={(value) => {
                                if (value === "__new__") {
                                    setShowNewInput({ ...showNewInput, type: true })
                                } else {
                                    setFormData({ ...formData, type: value === "__none__" ? null : value })
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {dropdownOptions.types.map((type) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                                <SelectItem value="__new__">+ New</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="season" className="text-sm font-mono">Season</Label>
                    <Input
                        id="season"
                        value={formData.season || ""}
                        onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                        placeholder="e.g., Season 1"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-mono">Language (comma-separated)</Label>
                    <Input
                        id="language"
                        value={languageInput}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        placeholder="e.g., English, French"
                    />
                </div>
            </div>

            {/* Genre */}
            <div className="space-y-2">
                <Label htmlFor="genre" className="text-sm font-mono">Genre (comma-separated)</Label>
                <Input
                    id="genre"
                    value={genreInput}
                    onChange={(e) => handleGenreChange(e.target.value)}
                    placeholder="e.g., Action, Drama"
                />
            </div>
        </>
    )
}
