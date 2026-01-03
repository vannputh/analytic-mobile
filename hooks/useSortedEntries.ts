"use client"

import { useMemo, useState } from "react"

export type SortDirection = "asc" | "desc" | null

export interface SortConfig<T extends string> {
    column: T | null
    direction: SortDirection
}

export interface UseSortedEntriesOptions<T, K extends string> {
    entries: T[]
    getValueForColumn: (entry: T, column: K) => any
    defaultSort?: SortConfig<K>
}

export function useSortedEntries<T, K extends string>({
    entries,
    getValueForColumn,
    defaultSort = { column: null, direction: null },
}: UseSortedEntriesOptions<T, K>) {
    const [sortColumn, setSortColumn] = useState<K | null>(defaultSort.column)
    const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort.direction)

    const handleSort = (column: K) => {
        if (sortColumn === column) {
            if (sortDirection === "asc") {
                setSortDirection("desc")
            } else if (sortDirection === "desc") {
                setSortColumn(null)
                setSortDirection(null)
            }
        } else {
            setSortColumn(column)
            setSortDirection("asc")
        }
    }

    const sortedEntries = useMemo(() => {
        if (!sortColumn || !sortDirection) {
            return entries
        }

        return [...entries].sort((a, b) => {
            const aValue = getValueForColumn(a, sortColumn)
            const bValue = getValueForColumn(b, sortColumn)

            if (aValue === bValue) return 0
            const comparison = aValue < bValue ? -1 : 1
            return sortDirection === "asc" ? comparison : -comparison
        })
    }, [entries, sortColumn, sortDirection, getValueForColumn])

    return {
        sortedEntries,
        sortColumn,
        sortDirection,
        handleSort,
        setSortColumn,
        setSortDirection,
    }
}
