"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { FoodEntry } from "@/lib/database.types"
import { useFoodMetrics } from "@/hooks/useFoodMetrics"
import { FoodFilterBar } from "@/components/analytics/FoodFilterBar"
import { FoodFilterState, defaultFoodFilterState, PRICE_LEVELS } from "@/lib/food-types"
import { Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Dynamic imports for chart components - reduces initial bundle size
const FoodKPIGrid = dynamic(
    () => import("@/components/analytics/FoodKPIGrid").then(m => m.FoodKPIGrid),
    {
        loading: () => (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        ),
        ssr: false
    }
)

const FoodAnalyticsCharts = dynamic(
    () => import("@/components/analytics/FoodAnalyticsCharts").then(m => m.FoodAnalyticsCharts),
    {
        loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />,
        ssr: false
    }
)

interface AnalyticsClientProps {
    initialEntries: FoodEntry[]
    itemCategories: string[]
    cuisineTypes: string[]
    categories: string[]
}

// Apply filters to entries
function applyFilters(entries: FoodEntry[], filters: FoodFilterState): FoodEntry[] {
    return entries.filter((entry) => {
        // Date range filter
        if (filters.dateFrom && entry.visit_date < filters.dateFrom) return false
        if (filters.dateTo && entry.visit_date > filters.dateTo) return false

        // Item categories filter - entry matches if ANY of its items have a matching category
        if (filters.itemCategories.length > 0) {
            const entryItemCategories = (entry.items_ordered || [])
                .map((item) => item.category)
                .filter(Boolean) as string[]
            if (!filters.itemCategories.some((c) => entryItemCategories.includes(c))) {
                return false
            }
        }

        // Cuisine types filter
        if (filters.cuisineTypes.length > 0) {
            const entryCuisines = entry.cuisine_type || []
            if (!filters.cuisineTypes.some((c) => entryCuisines.includes(c))) {
                return false
            }
        }

        // Place categories filter
        if (filters.categories.length > 0) {
            if (!entry.category || !filters.categories.includes(entry.category)) {
                return false
            }
        }

        // Price levels filter
        if (filters.priceLevels.length > 0) {
            if (!entry.price_level || !filters.priceLevels.includes(entry.price_level)) {
                return false
            }
        }

        // Min rating filter
        if (filters.minRating !== null) {
            if (!entry.overall_rating || entry.overall_rating < filters.minRating) {
                return false
            }
        }

        // Would return filter
        if (filters.wouldReturn !== null) {
            if (entry.would_return !== filters.wouldReturn) {
                return false
            }
        }

        return true
    })
}

export function AnalyticsClient({ initialEntries, itemCategories, cuisineTypes, categories }: AnalyticsClientProps) {
    const [filters, setFilters] = useState<FoodFilterState>(defaultFoodFilterState)

    const filterOptions = {
        itemCategories,
        cuisineTypes,
        categories,
        priceLevels: [...PRICE_LEVELS],
    }

    // Apply filters to entries
    const filteredEntries = useMemo(() => applyFilters(initialEntries, filters), [initialEntries, filters])

    // Calculate metrics from filtered entries
    const metrics = useFoodMetrics(filteredEntries)

    if (initialEntries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Utensils className="h-12 w-12 opacity-30 mb-4" />
                <p className="text-sm font-mono mb-3">No food entries yet</p>
                <Button asChild>
                    <Link href="/food">Add Your First Entry</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            <FoodFilterBar
                filters={filters}
                onFiltersChange={setFilters}
                options={filterOptions}
                totalCount={initialEntries.length}
                filteredCount={filteredEntries.length}
            />

            <main className="p-4 sm:p-6">
                {filteredEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Utensils className="h-12 w-12 opacity-30 mb-4" />
                        <p className="text-sm font-mono mb-3">No entries match your filters</p>
                        <Button variant="outline" onClick={() => setFilters(defaultFoodFilterState)}>
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <FoodKPIGrid metrics={metrics} />
                        <FoodAnalyticsCharts metrics={metrics} />
                    </div>
                )}
            </main>
        </>
    )
}
