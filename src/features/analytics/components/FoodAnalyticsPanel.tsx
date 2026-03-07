import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { DateRangeRow, MultiSelectChips } from "@/src/features/analytics/components/FilterChips"
import { KPIGrid } from "@/src/features/analytics/components/KPIGrid"
import { SimpleBarList } from "@/src/features/analytics/components/SimpleBarList"
import { useFoodMetrics } from "@/src/features/analytics/hooks/useFoodMetrics"
import {
  applyFoodFilters,
  defaultFoodFilters,
  extractFoodFilterOptions,
  type FoodFilterState
} from "@/src/features/analytics/lib/filters"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { FoodEntry } from "@/src/shared/types/database"

type FoodDrilldownDimension = "place" | "cuisine" | "itemCategory" | "city" | "month" | "rating"

interface FoodDrilldownSelection {
  dimension: FoodDrilldownDimension
  value: string
}

interface FoodAnalyticsPanelProps {
  entries: FoodEntry[]
}

export function FoodAnalyticsPanel({ entries }: FoodAnalyticsPanelProps) {
  const [filters, setFilters] = useState<FoodFilterState>(defaultFoodFilters)
  const [foodDrilldown, setFoodDrilldown] = useState<FoodDrilldownSelection | null>(null)
  const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set())

  const options = useMemo(() => extractFoodFilterOptions(entries), [entries])
  const filtered = useMemo(() => applyFoodFilters(entries, filters), [entries, filters])
  const metrics = useFoodMetrics(filtered)

  const drilldownEntries = useMemo(() => {
    if (!foodDrilldown) return []
    return filtered.filter((entry) => matchesFoodDrilldown(entry, foodDrilldown))
  }, [filtered, foodDrilldown])

  const drilldownByPlace = useMemo(() => {
    const grouped = new Map<string, FoodEntry[]>()
    for (const entry of drilldownEntries) {
      const placeKey = formatPlace(entry)
      const current = grouped.get(placeKey) ?? []
      current.push(entry)
      grouped.set(placeKey, current)
    }

    return Array.from(grouped.entries())
      .map(([place, placeEntries]) => {
        const sorted = [...placeEntries].sort((left, right) => right.visit_date.localeCompare(left.visit_date))
        const total = sorted.reduce((sum, item) => sum + foodTotal(item), 0)
        return {
          place,
          entries: sorted,
          total
        }
      })
      .sort((left, right) => right.entries.length - left.entries.length)
  }, [drilldownEntries])

  return (
    <View style={styles.root}>
      <View style={styles.filterBlock}>
        <DateRangeRow
          from={filters.dateFrom}
          to={filters.dateTo}
          onFromChange={(dateFrom) => setFilters({ ...filters, dateFrom })}
          onToChange={(dateTo) => setFilters({ ...filters, dateTo })}
        />
        <MultiSelectChips label="Place Type" options={options.categories} selected={filters.categories} onToggle={(value) => toggle(value, filters.categories, (categories) => setFilters({ ...filters, categories }))} />
        <MultiSelectChips label="Cuisine" options={options.cuisineTypes} selected={filters.cuisineTypes} onToggle={(value) => toggle(value, filters.cuisineTypes, (cuisineTypes) => setFilters({ ...filters, cuisineTypes }))} />
        <MultiSelectChips label="Food Type" options={options.itemCategories} selected={filters.itemCategories} onToggle={(value) => toggle(value, filters.itemCategories, (itemCategories) => setFilters({ ...filters, itemCategories }))} />
        <MultiSelectChips label="Price" options={options.priceLevels} selected={filters.priceLevels} onToggle={(value) => toggle(value, filters.priceLevels, (priceLevels) => setFilters({ ...filters, priceLevels }))} />
        <MultiSelectChips label="City" options={options.cities} selected={filters.cities} onToggle={(value) => toggle(value, filters.cities, (cities) => setFilters({ ...filters, cities }))} />
      </View>

      <KPIGrid
        rows={[
          { label: "visits", value: String(metrics.totalVisits) },
          { label: "spent", value: `$${metrics.totalSpent.toFixed(2)}` },
          { label: "avg rating", value: metrics.averageRating.toFixed(2) },
          { label: "unique places", value: String(metrics.uniquePlaces) },
          { label: "top city", value: metrics.topCity ?? "-" },
          { label: "top cuisine", value: metrics.topCuisine ?? "-" },
          {
            label: "would return",
            value: `${metrics.totalVisits > 0 ? Math.round((metrics.wouldReturnCount / metrics.totalVisits) * 100) : 0}%`
          },
          { label: "avg food", value: metrics.averageFoodRating.toFixed(2) }
        ]}
      />

      <SimpleBarList
        title="Visits by Month"
        rows={metrics.countByMonth.map((row) => ({ label: row.month, value: row.count }))}
        onSelectRow={(label) => {
          setExpandedPlaces(new Set())
          setFoodDrilldown((prev) =>
            prev && prev.dimension === "month" && prev.value === label
              ? null
              : { dimension: "month", value: label }
          )
        }}
        selectedLabel={foodDrilldown?.dimension === "month" ? foodDrilldown.value : null}
      />
      <SimpleBarList
        title="Spending by Month"
        rows={metrics.spentByMonth.map((row) => ({ label: row.month, value: row.amount }))}
        formatValue={(value) => `$${value.toFixed(0)}`}
      />
      <SimpleBarList
        title="By Cuisine"
        rows={toSortedRows(metrics.countByCuisine)}
        onSelectRow={(label) => {
          setExpandedPlaces(new Set())
          setFoodDrilldown((prev) =>
            prev && prev.dimension === "cuisine" && prev.value === label
              ? null
              : { dimension: "cuisine", value: label }
          )
        }}
        selectedLabel={foodDrilldown?.dimension === "cuisine" ? foodDrilldown.value : null}
      />
      <SimpleBarList
        title="By Item Category"
        rows={toSortedRows(metrics.countByItemCategory)}
        onSelectRow={(label) => {
          setExpandedPlaces(new Set())
          setFoodDrilldown((prev) =>
            prev && prev.dimension === "itemCategory" && prev.value === label
              ? null
              : { dimension: "itemCategory", value: label }
          )
        }}
        selectedLabel={foodDrilldown?.dimension === "itemCategory" ? foodDrilldown.value : null}
      />
      <SimpleBarList
        title="Most Visited Places"
        rows={metrics.mostVisitedPlaces.map((row) => ({ label: row.name, value: row.count }))}
        onSelectRow={(label) => {
          setExpandedPlaces(new Set())
          setFoodDrilldown((prev) =>
            prev && prev.dimension === "place" && prev.value === label
              ? null
              : { dimension: "place", value: label }
          )
        }}
        selectedLabel={foodDrilldown?.dimension === "place" ? foodDrilldown.value : null}
      />

      <FoodDrilldownCard
        selection={foodDrilldown}
        rows={drilldownByPlace}
        expandedPlaces={expandedPlaces}
        onTogglePlace={(place) =>
          setExpandedPlaces((prev) => {
            const next = new Set(prev)
            if (next.has(place)) next.delete(place)
            else next.add(place)
            return next
          })
        }
        onClear={() => {
          setFoodDrilldown(null)
          setExpandedPlaces(new Set())
        }}
      />
    </View>
  )
}

function FoodDrilldownCard({
  selection,
  rows,
  expandedPlaces,
  onTogglePlace,
  onClear
}: {
  selection: FoodDrilldownSelection | null
  rows: Array<{ place: string; entries: FoodEntry[]; total: number }>
  expandedPlaces: Set<string>
  onTogglePlace: (place: string) => void
  onClear: () => void
}) {
  const { palette } = useAppTheme()
  if (!selection) return null

  return (
    <View style={[styles.drilldownCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
      <View style={styles.drilldownHeader}>
        <Text style={[styles.blockTitle, { color: palette.text }]}>Drilldown: {selection.dimension} = {selection.value}</Text>
        <Pressable style={[styles.clearButton, { borderColor: palette.border }]} onPress={onClear}>
          <Text style={{ color: palette.text, fontSize: 12, fontWeight: "700" }}>Clear</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>No matching rows in current filter scope.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((group) => {
            const expanded = expandedPlaces.has(group.place)
            return (
              <View key={group.place} style={[styles.drilldownGroup, { borderColor: palette.border }]}> 
                <Pressable style={styles.drilldownGroupHeader} onPress={() => onTogglePlace(group.place)}>
                  <Text style={[styles.drilldownPlace, { color: palette.text }]}>{group.place}</Text>
                  <Text style={[styles.drilldownMeta, { color: palette.textMuted }]}>
                    {group.entries.length} visits • ${group.total.toFixed(2)} {expanded ? "▲" : "▼"}
                  </Text>
                </Pressable>
                {expanded
                  ? group.entries.map((entry) => (
                      <View key={entry.id} style={[styles.drilldownEntryRow, { borderColor: palette.border }]}> 
                        <Text style={[styles.drilldownEntryTitle, { color: palette.text }]}>{entry.visit_date}</Text>
                        <Text style={[styles.drilldownMeta, { color: palette.textMuted }]}>
                          Rating {entry.overall_rating ?? "-"} • ${foodTotal(entry).toFixed(2)}
                        </Text>
                      </View>
                    ))
                  : null}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function formatPlace(entry: FoodEntry): string {
  return entry.branch ? `${entry.name} - ${entry.branch}` : entry.name
}

function foodTotal(entry: FoodEntry): number {
  if (entry.total_price != null) return entry.total_price
  return (entry.items_ordered ?? []).reduce((sum, item) => sum + (item.price ?? 0), 0)
}

function matchesFoodDrilldown(entry: FoodEntry, selection: FoodDrilldownSelection): boolean {
  if (selection.dimension === "place") {
    return formatPlace(entry) === selection.value || entry.name === selection.value
  }
  if (selection.dimension === "cuisine") {
    return (entry.cuisine_type ?? []).includes(selection.value)
  }
  if (selection.dimension === "itemCategory") {
    return (entry.items_ordered ?? []).some((item) => {
      const categories = item.categories?.length ? item.categories : item.category ? [item.category] : []
      return categories.includes(selection.value)
    })
  }
  if (selection.dimension === "city") {
    return entry.city === selection.value
  }
  if (selection.dimension === "month") {
    return entry.visit_date.startsWith(selection.value)
  }
  const rounded = entry.overall_rating != null ? Math.floor(entry.overall_rating) : null
  return rounded != null && String(rounded) === selection.value
}

function toSortedRows(record: Record<string, number>) {
  return Object.entries(record)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
}

function toggle(value: string, selected: string[], onChange: (next: string[]) => void) {
  if (selected.includes(value)) {
    onChange(selected.filter((item) => item !== value))
  } else {
    onChange([...selected, value])
  }
}

const styles = StyleSheet.create({
  root: {
    gap: 12
  },
  filterBlock: {
    gap: 8
  },
  drilldownCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  drilldownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  clearButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  blockTitle: { fontSize: 14, fontWeight: "700" },
  drilldownGroup: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  drilldownGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  drilldownPlace: { fontSize: 13, fontWeight: "700", flex: 1 },
  drilldownMeta: { fontSize: 12 },
  drilldownEntryRow: { borderTopWidth: 1, paddingTop: 6, gap: 2 },
  drilldownEntryTitle: { fontSize: 12, fontWeight: "600" }
})
