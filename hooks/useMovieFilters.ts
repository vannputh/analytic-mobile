"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FilterState, defaultFilterState, applyFilters, extractFilterOptions, areFiltersEqual } from "@/lib/filter-types"
import { MediaEntry } from "@/lib/database.types"

// Helper functions to serialize/deserialize FilterState to/from URL params
function filtersToParams(filters: FilterState): URLSearchParams {
    const params = new URLSearchParams()

    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
    if (filters.dateTo) params.set("dateTo", filters.dateTo)
    if (filters.genres.length > 0) params.set("genres", filters.genres.join(","))
    if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","))
    if (filters.languages.length > 0) params.set("languages", filters.languages.join(","))
    if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","))
    if (filters.statuses.length > 0) params.set("statuses", filters.statuses.join(","))
    if (filters.types.length > 0) params.set("types", filters.types.join(","))

    return params
}

function paramsToFilters(params: URLSearchParams): FilterState {
    return {
        dateFrom: params.get("dateFrom") || null,
        dateTo: params.get("dateTo") || null,
        genres: params.get("genres")?.split(",").filter(Boolean) || [],
        mediums: params.get("mediums")?.split(",").filter(Boolean) || [],
        languages: params.get("languages")?.split(",").filter(Boolean) || [],
        platforms: params.get("platforms")?.split(",").filter(Boolean) || [],
        statuses: params.get("statuses")?.split(",").filter(Boolean) || [],
        types: params.get("types")?.split(",").filter(Boolean) || [],
    }
}

export function useMovieFilters(allEntries: MediaEntry[]) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [filters, setFilters] = useState<FilterState>(defaultFilterState)
    const [searchQuery, setSearchQuery] = useState("")

    const isInitialized = useRef(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isUpdatingFromState = useRef(false)

    // Initialize filters from URL params on mount or param change
    useEffect(() => {
        // Don't sync back if we're the ones updating the URL
        if (isUpdatingFromState.current) {
            isUpdatingFromState.current = false
            return
        }

        const urlFilters = paramsToFilters(searchParams)

        // Only update state if filters have actually changed
        setFilters(prev => {
            if (areFiltersEqual(prev, urlFilters)) return prev
            return urlFilters
        })

        const searchParam = searchParams.get("search") || ""
        // Only update if different to avoid unnecessary re-renders
        setSearchQuery(prev => {
            if (prev !== searchParam) return searchParam
            return prev
        })

        isInitialized.current = true
    }, [searchParams])

    // Update URL params when filters change (immediate) - but NOT for search
    useEffect(() => {
        if (!isInitialized.current) return

        const params = filtersToParams(filters)
        // Don't include searchQuery here - it's handled separately with debouncing
        const currentSearch = searchParams.get("search") || ""
        if (currentSearch) params.set("search", currentSearch)

        // Construct new query string
        const newQueryString = params.toString()
        const currentQueryString = searchParams.toString()

        // Only clean update the URL if something changed
        if (newQueryString !== currentQueryString) {
            isUpdatingFromState.current = true
            const newUrl = newQueryString ? `/movies?${newQueryString}` : "/movies"
            router.replace(newUrl, { scroll: false })
        }
    }, [filters, router, searchParams])

    // Debounce URL updates for search query to prevent page refresh on every keystroke
    useEffect(() => {
        if (!isInitialized.current) return

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // Set new timeout to update URL after user stops typing
        searchTimeoutRef.current = setTimeout(() => {
            const params = filtersToParams(filters)
            if (searchQuery) params.set("search", searchQuery)

            const newQueryString = params.toString()
            const currentQueryString = searchParams.toString()

            if (newQueryString !== currentQueryString) {
                isUpdatingFromState.current = true
                const newUrl = newQueryString ? `/movies?${newQueryString}` : "/movies"
                router.replace(newUrl, { scroll: false })
            }
        }, 300) // 300ms debounce

        // Cleanup timeout on unmount
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [searchQuery, filters, router, searchParams])

    // Extract filter options from ALL data (not just displayed)
    const filterOptions = useMemo(() => extractFilterOptions(allEntries), [allEntries])

    // Apply filters to ALL entries (not just displayed ones)
    const filterFilteredEntries = useMemo(() => applyFilters(allEntries, filters), [allEntries, filters])

    // Apply search filter to ALL filtered entries
    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) return filterFilteredEntries

        const query = searchQuery.toLowerCase().trim()
        return filterFilteredEntries.filter((entry) => {
            // Search in title
            if (entry.title?.toLowerCase().includes(query)) return true

            // Search in genre (array)
            if (entry.genre && Array.isArray(entry.genre)) {
                if (entry.genre.some(g => g.toLowerCase().includes(query))) return true
            }

            // Search in platform
            if (entry.platform?.toLowerCase().includes(query)) return true

            // Search in type
            if (entry.type?.toLowerCase().includes(query)) return true

            // Search in medium
            if (entry.medium?.toLowerCase().includes(query)) return true

            // Search in language
            if (entry.language && Array.isArray(entry.language)) {
                if (entry.language.some(l => l.toLowerCase().includes(query))) return true
            }

            // Search in status
            if (entry.status?.toLowerCase().includes(query)) return true

            // Search in season
            if (entry.season?.toLowerCase().includes(query)) return true

            return false
        })
    }, [filterFilteredEntries, searchQuery])

    return {
        filters,
        setFilters,
        searchQuery,
        setSearchQuery,
        filterOptions,
        filteredEntries
    }
}
