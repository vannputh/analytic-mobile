"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { BookEntry } from "@/lib/database.types"
import { BookFilterState, defaultBookFilterState, applyBookFilters, extractBookFilterOptions } from "@/lib/book-types"
import { useBookMetrics } from "@/hooks/useBookMetrics"
import { BookFilterBar } from "@/components/analytics/BookFilterBar"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Dynamic import for chart component - reduces initial bundle size
const BookAnalyticsCharts = dynamic(
    () => import("@/components/analytics/BookAnalyticsCharts").then(m => m.BookAnalyticsCharts),
    {
        loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />,
        ssr: false
    }
)

interface BookAnalyticsClientProps {
    books: BookEntry[]
}

export function BookAnalyticsClient({ books }: BookAnalyticsClientProps) {
    const [filters, setFilters] = useState<BookFilterState>(defaultBookFilterState)

    // Extract filter options from raw data
    const filterOptions = useMemo(() => extractBookFilterOptions(books), [books])

    // Apply filters to entries
    const filteredBooks = useMemo(() => applyBookFilters(books, filters), [books, filters])

    // Calculate metrics from filtered entries
    const metrics = useBookMetrics(filteredBooks)

    if (books.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="h-12 w-12 opacity-30 mb-4" />
                <p className="text-sm font-mono mb-3">No books yet</p>
                <Button asChild>
                    <Link href="/books">Add Books</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-0">
            {/* Filter Bar */}
            <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
                <BookFilterBar
                    filters={filters}
                    onFiltersChange={setFilters}
                    options={filterOptions}
                    totalCount={books.length}
                    filteredCount={filteredBooks.length}
                />
            </div>

            {/* Charts */}
            <div className="pt-6">
                <BookAnalyticsCharts metrics={metrics} />
            </div>
        </div>
    )
}
