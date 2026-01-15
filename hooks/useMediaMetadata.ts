import { useState } from "react"
import { toast } from "sonner"

export type MetadataSource = "omdb" | "tmdb"

export interface MetadataFetchOptions {
    title?: string
    imdb_id?: string
    medium?: string
    season?: string
}

export function useMediaMetadata() {
    const [fetching, setFetching] = useState(false)
    const [fetchingSource, setFetchingSource] = useState<MetadataSource | null>(null)

    // Helper function to detect if a string is an ISBN
    const detectISBN = (input: string | null | undefined): string | null => {
        if (!input) return null
        // Remove all non-alphanumeric characters (keep digits and X)
        const cleaned = input.trim().replace(/[^0-9X]/g, '')

        // Check for ISBN-13 (13 digits, starting with 978 or 979)
        if (/^(978|979)\d{10}$/.test(cleaned)) {
            return cleaned
        }

        // Check for ISBN-10 (10 digits, may end with X)
        if (/^\d{9}[\dX]$/.test(cleaned)) {
            return cleaned
        }

        return null
    }

    // Helper function to detect if a string is an IMDb ID
    const detectIMDbID = (input: string | null | undefined): boolean => {
        if (!input) return false
        const trimmed = input.trim()
        // IMDb IDs start with "tt" followed by 7-8 digits
        return /^tt\d{7,8}$/i.test(trimmed)
    }

    const fetchMetadata = async (
        source: MetadataSource,
        options: MetadataFetchOptions
    ) => {
        const { title, imdb_id, medium, season } = options

        // Check if ISBN or IMDb ID is provided in imdb_id field
        const isbn = detectISBN(imdb_id)
        const isImdbId = detectIMDbID(imdb_id)
        const hasTitle = title?.trim()

        if (!hasTitle && !isbn && !isImdbId) {
            throw new Error("Please enter a title, ISBN, or IMDb ID first")
        }

        setFetching(true)
        setFetchingSource(source)

        try {
            // Build URL with search query and optional parameters
            let url = ""

            if (isbn || isImdbId) {
                // If ISBN or IMDb ID is provided, pass it as imdb_id parameter
                url = `/api/metadata?imdb_id=${encodeURIComponent(imdb_id!.trim())}&source=${source}`

                // Also pass title if available (for fallback or additional context)
                if (hasTitle) {
                    url += `&title=${encodeURIComponent(hasTitle)}`
                }
            } else {
                // Use title for search
                url = `/api/metadata?title=${encodeURIComponent(hasTitle!)}&source=${source}`
            }

            if (medium) {
                // Pass medium parameter for books (Google Books API)
                if (medium === "Book") {
                    url += `&medium=${encodeURIComponent(medium)}`
                } else {
                    // Map our medium values to OMDB type for movies and TV shows
                    const typeMap: Record<string, string> = {
                        "Movie": "movie",
                        "TV Show": "series",
                    }
                    const omdbType = typeMap[medium]
                    if (omdbType) {
                        url += `&type=${omdbType}`
                    }
                }
            } else if (isbn) {
                // If ISBN is detected but medium not set, auto-set to Book
                url += `&medium=Book`
            }

            if (season) {
                url += `&season=${encodeURIComponent(season)}`
            }

            const response = await fetch(url)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to fetch metadata")
            }

            const metadata = await response.json()
            return metadata
        } finally {
            setFetching(false)
            setFetchingSource(null)
        }
    }

    return {
        fetchMetadata,
        fetching,
        fetchingSource,
        detectISBN,
        detectIMDbID
    }
}
