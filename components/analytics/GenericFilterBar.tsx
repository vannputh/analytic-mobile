"use client"

import { X, Filter, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MultiSelect, DateRangePicker } from "@/components/filter-components"
import { DateRange } from "react-day-picker"

export interface FilterConfig<T> {
    key: keyof T
    label: string
    type: 'select' | 'date'
    options?: string[]
}

export interface GenericFilterBarProps<T> {
    filters: T & { dateFrom?: string | null; dateTo?: string | null }
    onFiltersChange: (filters: T) => void
    config: FilterConfig<T>[]
    defaultState: T
    totalCount: number
    filteredCount: number
    entityName?: string
}

export function GenericFilterBar<T extends Record<string, any>>({
    filters,
    onFiltersChange,
    config,
    defaultState,
    totalCount,
    filteredCount,
    entityName = "items"
}: GenericFilterBarProps<T>) {

    // Calculate active filters
    const hasActiveFilters = config.some(c => {
        if (c.type === 'date') return filters.dateFrom || filters.dateTo;
        if (c.type === 'select') {
            const val = filters[c.key];
            return Array.isArray(val) && val.length > 0;
        }
        return false;
    });

    const activeFilterCount = config.reduce((acc, c) => {
        if (c.type === 'date' && (filters.dateFrom || filters.dateTo)) return acc + 1;
        if (c.type === 'select') {
            const val = filters[c.key];
            if (Array.isArray(val)) return acc + val.length;
        }
        return acc;
    }, 0);

    const handleDateChange = (from: string | null, to: string | null) => {
        onFiltersChange({ ...filters, dateFrom: from, dateTo: to });
    };

    const handleReset = () => {
        onFiltersChange(defaultState);
    };

    return (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 overflow-x-auto scrollbar-hide">
                <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-xs font-mono uppercase tracking-wider">Filters</span>
                </div>

                <Separator orientation="vertical" className="h-6 hidden sm:block" />

                {config.map((c) => (
                    <div key={c.key as string} className="flex-shrink-0">
                        {c.type === 'date' && (
                            <DateRangePicker
                                from={filters.dateFrom ?? null}
                                to={filters.dateTo ?? null}
                                onChange={handleDateChange}
                            />
                        )}
                        {c.type === 'select' && c.options && (
                            <MultiSelect
                                label={c.label}
                                options={c.options}
                                selected={filters[c.key] as string[]}
                                onChange={(newVal) => onFiltersChange({ ...filters, [c.key]: newVal })}
                            />
                        )}
                    </div>
                ))}

                {hasActiveFilters && (
                    <>
                        <Separator orientation="vertical" className="h-6" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-mono"
                            onClick={handleReset}
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
                        {filteredCount === totalCount ? totalCount : `${filteredCount}/${totalCount}`} {entityName}
                    </span>
                </div>
            </div>

            {/* Active filter pills */}
            {hasActiveFilters && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 pb-2 flex-wrap">
                    {(filters.dateFrom || filters.dateTo) && (
                        <button
                            type="button"
                            onClick={() => handleDateChange(null, null)}
                            className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                        >
                            {filters.dateFrom || "∞"} → {filters.dateTo || "∞"}
                            <X className="ml-1 h-2.5 w-2.5" />
                        </button>
                    )}
                    {config.filter(c => c.type === 'select').flatMap(c => {
                        const values = filters[c.key] as string[];
                        return values.map(val => (
                            <button
                                key={`${c.key as string}-${val}`}
                                type="button"
                                onClick={() => onFiltersChange({
                                    ...filters,
                                    [c.key]: values.filter(v => v !== val)
                                })}
                                className="inline-flex items-center h-5 px-1.5 text-[10px] font-mono rounded-sm bg-secondary hover:bg-destructive/20 transition-colors"
                            >
                                {val}
                                <X className="ml-1 h-2.5 w-2.5" />
                            </button>
                        ));
                    })}
                </div>
            )}
        </div>
    )
}
