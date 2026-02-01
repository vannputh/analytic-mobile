"use client"

import { X, Filter, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FoodFilterState, defaultFoodFilterState, DINING_OPTIONS, DINING_TYPE_VALUES } from "@/lib/food-types"
import { MultiSelect, DateRangePicker } from "@/components/filter-components"

interface FilterOptions {
    itemCategories: string[]
    cuisineTypes: string[]
    categories: string[]
    cities: string[]
    priceLevels: string[]
}

interface FoodFilterBarProps {
    filters: FoodFilterState
    onFiltersChange: (filters: FoodFilterState) => void
    options: FilterOptions
    totalCount: number
    filteredCount: number
}

export function FoodFilterBar({
    filters,
    onFiltersChange,
    options,
    totalCount,
    filteredCount,
}: FoodFilterBarProps) {
    const hasActiveFilters =
        filters.dateFrom ||
        filters.dateTo ||
        filters.itemCategories.length > 0 ||
        filters.cuisineTypes.length > 0 ||
        filters.categories.length > 0 ||
        filters.cities.length > 0 ||
        filters.priceLevels.length > 0 ||
        filters.diningTypes.length > 0 ||
        filters.minRating !== null ||
        filters.wouldReturn !== null

    const activeFilterCount = [
        filters.dateFrom || filters.dateTo ? 1 : 0,
        filters.itemCategories.length,
        filters.cuisineTypes.length,
        filters.categories.length,
        filters.cities.length,
        filters.priceLevels.length,
        filters.diningTypes.length,
        filters.minRating !== null ? 1 : 0,
        filters.wouldReturn !== null ? 1 : 0,
    ].reduce((a, b) => a + b, 0)

    return (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 overflow-x-auto scrollbar-hide">
                <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-xs font-mono uppercase tracking-wider">Filters</span>
                </div>

                <Separator orientation="vertical" className="h-6 hidden sm:block" />

                <DateRangePicker
                    from={filters.dateFrom}
                    to={filters.dateTo}
                    onChange={(from, to) => onFiltersChange({ ...filters, dateFrom: from, dateTo: to })}
                />

                <MultiSelect
                    label="Food Type"
                    options={options.itemCategories}
                    selected={filters.itemCategories}
                    onChange={(itemCategories) => onFiltersChange({ ...filters, itemCategories })}
                />

                <MultiSelect
                    label="Cuisine"
                    options={options.cuisineTypes}
                    selected={filters.cuisineTypes}
                    onChange={(cuisineTypes) => onFiltersChange({ ...filters, cuisineTypes })}
                />

                <MultiSelect
                    label="Place Type"
                    options={options.categories}
                    selected={filters.categories}
                    onChange={(categories) => onFiltersChange({ ...filters, categories })}
                />

                <MultiSelect
                    label="City"
                    options={options.cities}
                    selected={filters.cities}
                    onChange={(cities) => onFiltersChange({ ...filters, cities })}
                />

                <MultiSelect
                    label="Price"
                    options={options.priceLevels}
                    selected={filters.priceLevels}
                    onChange={(priceLevels) => onFiltersChange({ ...filters, priceLevels })}
                />

                <MultiSelect
                    label="Dining type"
                    options={DINING_TYPE_VALUES}
                    selected={filters.diningTypes}
                    onChange={(diningTypes) => onFiltersChange({ ...filters, diningTypes })}
                />

                <MultiSelect
                    label="Min rating"
                    options={["4+", "5"]}
                    selected={
                        filters.minRating === null
                            ? []
                            : filters.minRating === 4
                              ? ["4+"]
                              : ["5"]
                    }
                    onChange={(selected) => {
                        const minRating =
                            selected.length === 0
                                ? null
                                : selected.includes("5")
                                  ? 5
                                  : selected.includes("4+")
                                    ? 4
                                    : null
                        onFiltersChange({ ...filters, minRating })
                    }}
                />

                <MultiSelect
                    label="Would go back"
                    options={["Yes", "No"]}
                    selected={
                        filters.wouldReturn === null
                            ? []
                            : filters.wouldReturn
                              ? ["Yes"]
                              : ["No"]
                    }
                    onChange={(selected) => {
                        const wouldReturn =
                            selected.length === 0
                                ? null
                                : selected.includes("Yes")
                                  ? true
                                  : selected.includes("No")
                                    ? false
                                    : null
                        onFiltersChange({ ...filters, wouldReturn })
                    }}
                />

                {hasActiveFilters && (
                    <>
                        <Separator orientation="vertical" className="h-6" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-mono"
                            onClick={() => onFiltersChange(defaultFoodFilterState)}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Reset
                        </Button>
                    </>
                )}

                <div className="ml-auto flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono text-muted-foreground flex-shrink-0">
                    {hasActiveFilters && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                            {activeFilterCount} active
                        </Badge>
                    )}
                    <span>
                        {filteredCount === totalCount ? totalCount : `${filteredCount}/${totalCount}`} entries
                    </span>
                </div>
            </div>

            {/* Active filter pills */}
            {hasActiveFilters && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 pb-2 flex-wrap">
                    {(filters.dateFrom || filters.dateTo) && (
                        <button
                            type="button"
                            onClick={() => onFiltersChange({ ...filters, dateFrom: null, dateTo: null })}
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {filters.dateFrom || "∞"} → {filters.dateTo || "∞"}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    )}
                    {filters.itemCategories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    itemCategories: filters.itemCategories.filter((x) => x !== c),
                                })
                            }
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {c}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    ))}
                    {filters.cuisineTypes.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    cuisineTypes: filters.cuisineTypes.filter((x) => x !== c),
                                })
                            }
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {c}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    ))}
                    {filters.categories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    categories: filters.categories.filter((x) => x !== c),
                                })
                            }
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {c}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    ))}
                    {filters.cities.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    cities: filters.cities.filter((x) => x !== c),
                                })
                            }
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {c}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    ))}
                    {filters.priceLevels.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    priceLevels: filters.priceLevels.filter((x) => x !== p),
                                })
                            }
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {p}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    ))}
                    {filters.diningTypes.map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    diningTypes: filters.diningTypes.filter((x) => x !== d),
                                })
                            }
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {DINING_OPTIONS.find((o) => o.value === d)?.label ?? d}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    ))}
                    {filters.minRating !== null && (
                        <button
                            type="button"
                            onClick={() => onFiltersChange({ ...filters, minRating: null })}
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            Min rating: {filters.minRating === 5 ? "5" : `${filters.minRating}+`}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    )}
                    {filters.wouldReturn !== null && (
                        <button
                            type="button"
                            onClick={() => onFiltersChange({ ...filters, wouldReturn: null })}
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            Would return: {filters.wouldReturn ? "Yes" : "No"}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default FoodFilterBar
