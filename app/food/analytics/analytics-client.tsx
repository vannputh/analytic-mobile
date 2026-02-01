"use client"

import React, { useMemo, useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { FoodEntry } from "@/lib/database.types"
import { useFoodMetrics } from "@/hooks/useFoodMetrics"
import { FoodFilterBar } from "@/components/analytics/FoodFilterBar"
import { FoodFilterState, defaultFoodFilterState, PRICE_LEVELS } from "@/lib/food-types"
import { Utensils, ChevronLeft, ChevronRight, ChevronDown, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FoodDetailsDialog } from "@/components/food-details-dialog"
import { FoodAddDialog } from "@/components/food-add-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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
    cities: string[]
}

// Apply filters to entries
function applyFilters(entries: FoodEntry[], filters: FoodFilterState): FoodEntry[] {
    return entries.filter((entry) => {
        // Date range filter
        if (filters.dateFrom && entry.visit_date < filters.dateFrom) return false
        if (filters.dateTo && entry.visit_date > filters.dateTo) return false

        // Item categories filter - entry matches if ANY of its items have a matching category (use item.categories or item.category like useFoodMetrics)
        if (filters.itemCategories.length > 0) {
            const entryItemCategories = (entry.items_ordered || []).flatMap((item) => {
                const cats = item.categories?.length ? item.categories : item.category ? [item.category] : []
                return cats
            })
            if (!filters.itemCategories.some((c) => entryItemCategories.includes(c))) {
                return false
            }
        }

        // Cities filter
        if (filters.cities.length > 0) {
            if (!entry.city || !filters.cities.includes(entry.city)) {
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

        // Dining type filter
        if (filters.diningTypes.length > 0) {
            if (!entry.dining_type || !filters.diningTypes.includes(entry.dining_type)) {
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

export type DrillDown = { dimension: string; value: string; label: string }

function getMonthKey(dateStr: string | null): string | null {
    if (!dateStr) return null
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function filterEntriesByDrill(entries: FoodEntry[], drill: DrillDown): FoodEntry[] {
    return entries.filter((entry) => {
        switch (drill.dimension) {
            case "cuisine":
                return entry.cuisine_type?.includes(drill.value) ?? false
            case "category":
                return entry.category === drill.value
            case "itemCategory": {
                const cats = (entry.items_ordered || []).flatMap((item) =>
                    item.categories?.length ? item.categories : item.category ? [item.category] : []
                )
                return cats.includes(drill.value)
            }
            case "place":
                return entry.name === drill.value
            case "city":
                return entry.city === drill.value
            case "neighborhood":
                return entry.neighborhood === drill.value
            case "tag":
                return entry.tags?.includes(drill.value) ?? false
            case "diningType":
                return entry.dining_type === drill.value
            case "rating":
                return Math.floor(entry.overall_rating ?? 0) === Number(drill.value)
            case "month": {
                const key = getMonthKey(entry.visit_date)
                return key === drill.value
            }
            default:
                return false
        }
    })
}

export function AnalyticsClient({ initialEntries, itemCategories, cuisineTypes, categories, cities }: AnalyticsClientProps) {
    const router = useRouter()
    const [filters, setFilters] = useState<FoodFilterState>(defaultFoodFilterState)
    const [drillDown, setDrillDown] = useState<DrillDown | null>(null)
    const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set())
    const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null)
    const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)

    const togglePlaceExpanded = useCallback((placeName: string) => {
        setExpandedPlaces((prev) => {
            const next = new Set(prev)
            if (next.has(placeName)) next.delete(placeName)
            else next.add(placeName)
            return next
        })
    }, [])

    useEffect(() => {
        setExpandedPlaces(new Set())
    }, [drillDown])

    const filterOptions = {
        itemCategories,
        cuisineTypes,
        categories,
        cities,
        priceLevels: [...PRICE_LEVELS],
    }

    // Apply filters to entries
    const filteredEntries = useMemo(() => applyFilters(initialEntries, filters), [initialEntries, filters])

    // Drill-down: entries matching the selected chart segment
    const drillDownEntries = useMemo(
        () => (drillDown ? filterEntriesByDrill(filteredEntries, drillDown) : []),
        [filteredEntries, drillDown]
    )

    // Group drill-down entries by place name; entries within each group sorted by visit_date desc
    const groupedByPlace = useMemo(() => {
        const map = new Map<string, FoodEntry[]>()
        for (const entry of drillDownEntries) {
            const name = entry.name || ""
            if (!map.has(name)) map.set(name, [])
            map.get(name)!.push(entry)
        }
        const groups: { placeName: string; entries: FoodEntry[] }[] = []
        map.forEach((entries, placeName) => {
            const sorted = [...entries].sort(
                (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
            )
            groups.push({ placeName, entries: sorted })
        })
        groups.sort(
            (a, b) =>
                new Date(b.entries[0]!.visit_date).getTime() - new Date(a.entries[0]!.visit_date).getTime()
        )
        return groups
    }, [drillDownEntries])

    const onDrillDown = useCallback((dimension: string, value: string, label: string) => {
        setDrillDown({ dimension, value, label })
    }, [])

    const onClearDrillDown = useCallback(() => {
        setDrillDown(null)
        setExpandedPlaces(new Set())
    }, [])

    const handleViewEntry = useCallback((entry: FoodEntry) => {
        setSelectedEntry(entry)
        setIsDetailsOpen(true)
    }, [])

    const handleEditEntry = useCallback((entry: FoodEntry) => {
        setEditingEntry(entry)
        setIsDetailsOpen(false)
        setIsAddOpen(true)
    }, [])

    const handleEntrySuccess = useCallback(() => {
        router.refresh()
        setIsAddOpen(false)
        setEditingEntry(null)
    }, [router])

    const handleDeleteEntry = useCallback((id: string) => {
        router.refresh()
    }, [router])

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

            {drillDown && (
                <Card className="sticky top-0 z-10 mx-4 mt-4 sm:mx-6 bg-background shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            {drillDown.label} ({drillDownEntries.length})
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={onClearDrillDown} className="gap-1">
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {drillDownEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">No entries match this selection.</p>
                        ) : (
                            <ScrollArea className="h-[280px] rounded-md border">
                                <table className="w-full caption-bottom text-sm border-collapse">
                                    <TableHeader>
                                        <TableRow className="sticky top-0 z-10 border-b bg-card hover:bg-card">
                                            <TableHead className="bg-card">Place</TableHead>
                                            <TableHead className="bg-card w-16">Visits</TableHead>
                                            <TableHead className="bg-card">Date</TableHead>
                                            <TableHead className="bg-card">City</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedByPlace.map(({ placeName, entries }) => {
                                            const isSingle = entries.length === 1
                                            const mostRecent = entries[0]!
                                            const isExpanded = expandedPlaces.has(placeName)
                                            return (
                                                <React.Fragment key={placeName}>
                                                    <TableRow
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() =>
                                                            isSingle
                                                                ? handleViewEntry(mostRecent)
                                                                : togglePlaceExpanded(placeName)
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault()
                                                                isSingle
                                                                    ? handleViewEntry(mostRecent)
                                                                    : togglePlaceExpanded(placeName)
                                                            }
                                                        }}
                                                        className="cursor-pointer bg-muted/30 font-medium hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                                                    >
                                                        <TableCell className="font-medium">
                                                            <span className="flex items-center gap-1.5">
                                                                {!isSingle &&
                                                                    (isExpanded ? (
                                                                        <ChevronDown className="h-4 w-4 shrink-0" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4 shrink-0" />
                                                                    ))}
                                                                {placeName}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{isSingle ? "1" : "multiple"}</TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {isSingle
                                                                ? new Date(mostRecent.visit_date).toLocaleDateString()
                                                                : "multiple"}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {isSingle ? (
                                                                mostRecent.city ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                                        {mostRecent.city}
                                                                    </span>
                                                                ) : (
                                                                    "—"
                                                                )
                                                            ) : (
                                                                "multiple"
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    {!isSingle &&
                                                        isExpanded &&
                                                        entries.map((entry) => (
                                                            <TableRow
                                                                key={entry.id}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => handleViewEntry(entry)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" || e.key === " ") {
                                                                        e.preventDefault()
                                                                        handleViewEntry(entry)
                                                                    }
                                                                }}
                                                                className="cursor-pointer hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                                                            >
                                                                <TableCell className="text-muted-foreground pl-8">
                                                                    {" "}
                                                                </TableCell>
                                                                <TableCell />
                                                                <TableCell className="text-muted-foreground">
                                                                    {new Date(entry.visit_date).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground">
                                                                    {entry.city ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                                            {entry.city}
                                                                        </span>
                                                                    ) : (
                                                                        "—"
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                </React.Fragment>
                                            )
                                        })}
                                    </TableBody>
                                </table>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}

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
                        <FoodAnalyticsCharts
                            metrics={metrics}
                            onDrillDown={onDrillDown}
                        />
                    </div>
                )}
            </main>

            <FoodDetailsDialog
                entry={selectedEntry}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
            />

            <FoodAddDialog
                entry={editingEntry}
                open={isAddOpen}
                onOpenChange={(open) => {
                    setIsAddOpen(open)
                    if (!open) setEditingEntry(null)
                }}
                onSuccess={handleEntrySuccess}
            />
        </>
    )
}
