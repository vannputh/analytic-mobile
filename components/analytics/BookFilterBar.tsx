"use client"

import { BookFilterState, defaultBookFilterState } from "@/lib/book-types"
import { GenericFilterBar, FilterConfig } from "./GenericFilterBar"

interface FilterOptions {
    genres: string[]
    formats: string[]
    languages: string[]
    statuses: string[]
    authors: string[]
}

interface BookFilterBarProps {
    filters: BookFilterState
    onFiltersChange: (filters: BookFilterState) => void
    options: FilterOptions
    totalCount: number
    filteredCount: number
}

export function BookFilterBar({
    filters,
    onFiltersChange,
    options,
    totalCount,
    filteredCount,
}: BookFilterBarProps) {

    const config: FilterConfig<BookFilterState>[] = [
        { key: 'dateFrom', label: 'Date Range', type: 'date' },
        { key: 'genres', label: 'Genre', type: 'select', options: options.genres },
        { key: 'formats', label: 'Format', type: 'select', options: options.formats },
        { key: 'statuses', label: 'Status', type: 'select', options: options.statuses },
        { key: 'authors', label: 'Author', type: 'select', options: options.authors },
        { key: 'languages', label: 'Language', type: 'select', options: options.languages },
    ]

    return (
        <GenericFilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            config={config}
            defaultState={defaultBookFilterState}
            totalCount={totalCount}
            filteredCount={filteredCount}
            entityName="books"
        />
    )
}

export default BookFilterBar
