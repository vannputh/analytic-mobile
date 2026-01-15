"use client"

import { MusicFilterState, defaultMusicFilterState } from "@/lib/music-types"
import { GenericFilterBar, FilterConfig } from "./GenericFilterBar"

interface FilterOptions {
    genres: string[]
    types: string[]
    platforms: string[]
    statuses: string[]
    artists: string[]
}

interface MusicFilterBarProps {
    filters: MusicFilterState
    onFiltersChange: (filters: MusicFilterState) => void
    options: FilterOptions
    totalCount: number
    filteredCount: number
}

export function MusicFilterBar({
    filters,
    onFiltersChange,
    options,
    totalCount,
    filteredCount,
}: MusicFilterBarProps) {

    const config: FilterConfig<MusicFilterState>[] = [
        { key: 'dateFrom', label: 'Date Range', type: 'date' }, // Reusing key for placement, though DateRangePicker handles both
        { key: 'genres', label: 'Genre', type: 'select', options: options.genres },
        { key: 'types', label: 'Type', type: 'select', options: options.types },
        { key: 'platforms', label: 'Platform', type: 'select', options: options.platforms },
        { key: 'statuses', label: 'Status', type: 'select', options: options.statuses },
        { key: 'artists', label: 'Artist', type: 'select', options: options.artists },
    ]

    return (
        <GenericFilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            config={config}
            defaultState={defaultMusicFilterState}
            totalCount={totalCount}
            filteredCount={filteredCount}
            entityName="tracks"
        />
    )
}

export default MusicFilterBar
