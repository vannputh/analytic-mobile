"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MediaEntryInsert } from "@/lib/database.types"

interface BasicDetailsSectionProps {
    title: string | null
    onChange: (value: string) => void
    onFetchMetadata: (source: "omdb" | "tmdb") => void
    fetchingMetadata: boolean
    fetchingSource: "omdb" | "tmdb" | null
    imdbId: string | null
    detectISBN: (val: string) => string | null
    detectIMDbID: (val: string) => boolean
}

export function BasicDetailsSection({
    title,
    onChange,
    onFetchMetadata,
    fetchingMetadata,
    fetchingSource,
    imdbId,
    detectISBN,
    detectIMDbID,
}: BasicDetailsSectionProps) {
    const hasValidIdentifier = (title?.trim() || detectISBN(imdbId || "") || detectIMDbID(imdbId || ""))

    return (
        <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-mono">
                Title <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
                <Input
                    id="title"
                    value={title || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter title"
                    required
                    className="flex-1"
                />
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onFetchMetadata("omdb")}
                        disabled={fetchingMetadata || !hasValidIdentifier}
                    >
                        {fetchingMetadata && fetchingSource === "omdb" ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Fetching...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                OMDB
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onFetchMetadata("tmdb")}
                        disabled={fetchingMetadata || !hasValidIdentifier}
                    >
                        {fetchingMetadata && fetchingSource === "tmdb" ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Fetching...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                TMDB
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
