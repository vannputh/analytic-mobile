"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface MetadataOverrideDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pendingMetadata: any
    currentData: any
    overrideFields: Record<string, boolean>
    onOverrideFieldsChange: (fields: Record<string, boolean>) => void
    onConfirm: () => void
    onCancel: () => void
}

export function MetadataOverrideDialog({
    open,
    onOpenChange,
    pendingMetadata,
    currentData,
    overrideFields,
    onOverrideFieldsChange,
    onConfirm,
    onCancel,
}: MetadataOverrideDialogProps) {
    if (!pendingMetadata) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Select Fields to Override</DialogTitle>
                    <DialogDescription>
                        Choose which metadata fields you want to override with the fetched data.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 flex-1 overflow-y-auto min-h-0">
                    <div className="space-y-2">
                        {pendingMetadata.title && currentData.title && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-title"
                                    checked={overrideFields.title}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, title: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-title" className="text-sm font-medium cursor-pointer block mb-1">
                                        Title
                                    </label>
                                    <div className="text-xs text-muted-foreground break-words">
                                        {pendingMetadata.title}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.poster_url && currentData.poster_url && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-poster"
                                    checked={overrideFields.poster_url}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, poster_url: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-poster" className="text-sm font-medium cursor-pointer block mb-1">
                                        Poster URL
                                    </label>
                                    <div className="text-xs text-muted-foreground break-all">
                                        {pendingMetadata.poster_url}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.genre && currentData.genre && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-genre"
                                    checked={overrideFields.genre}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, genre: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-genre" className="text-sm font-medium cursor-pointer block mb-1">
                                        Genre
                                    </label>
                                    <div className="text-xs text-muted-foreground break-words">
                                        {Array.isArray(pendingMetadata.genre)
                                            ? pendingMetadata.genre.join(", ")
                                            : pendingMetadata.genre}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.language && currentData.language && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-language"
                                    checked={overrideFields.language}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, language: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-language" className="text-sm font-medium cursor-pointer block mb-1">
                                        Language
                                    </label>
                                    <div className="text-xs text-muted-foreground break-words">
                                        {Array.isArray(pendingMetadata.language)
                                            ? pendingMetadata.language.join(", ")
                                            : pendingMetadata.language}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.average_rating !== null && currentData.average_rating !== null && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-rating"
                                    checked={overrideFields.average_rating}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, average_rating: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-rating" className="text-sm font-medium cursor-pointer block mb-1">
                                        Average Rating
                                    </label>
                                    <div className="text-xs text-muted-foreground">
                                        {pendingMetadata.average_rating}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.length && currentData.length && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-length"
                                    checked={overrideFields.length}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, length: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-length" className="text-sm font-medium cursor-pointer block mb-1">
                                        Length
                                    </label>
                                    <div className="text-xs text-muted-foreground break-words">
                                        {pendingMetadata.length}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.episodes !== null && currentData.episodes !== null && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-episodes"
                                    checked={overrideFields.episodes}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, episodes: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-episodes" className="text-sm font-medium cursor-pointer block mb-1">
                                        Episodes
                                    </label>
                                    <div className="text-xs text-muted-foreground">
                                        {pendingMetadata.episodes}
                                    </div>
                                </div>
                            </div>
                        )}
                        {pendingMetadata.imdb_id && currentData.imdb_id && (
                            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                                <input
                                    type="checkbox"
                                    id="override-imdb"
                                    checked={overrideFields.imdb_id}
                                    onChange={(e) => onOverrideFieldsChange({ ...overrideFields, imdb_id: e.target.checked })}
                                    className="h-4 w-4 mt-0.5 rounded border-gray-300 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor="override-imdb" className="text-sm font-medium cursor-pointer block mb-1">
                                        IMDb ID
                                    </label>
                                    <div className="text-xs text-muted-foreground break-all">
                                        {pendingMetadata.imdb_id}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2 flex-shrink-0 border-t pt-4 mt-4">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                // Select all
                                onOverrideFieldsChange({
                                    title: true,
                                    poster_url: true,
                                    genre: true,
                                    language: true,
                                    average_rating: true,
                                    length: true,
                                    episodes: true,
                                    imdb_id: true,
                                })
                            }}
                            className="flex-1 sm:flex-initial"
                        >
                            Select All
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                // Deselect all
                                onOverrideFieldsChange({
                                    title: false,
                                    poster_url: false,
                                    genre: false,
                                    language: false,
                                    average_rating: false,
                                    length: false,
                                    episodes: false,
                                    imdb_id: false,
                                })
                            }}
                            className="flex-1 sm:flex-initial"
                        >
                            Deselect All
                        </Button>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-initial">
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={onConfirm}
                            disabled={!Object.values(overrideFields).some(v => v)}
                            className="flex-1 sm:flex-initial"
                        >
                            Apply Selected
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
