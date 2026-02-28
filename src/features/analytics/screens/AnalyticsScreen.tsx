import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMediaEntries } from "@/src/features/media/hooks/useMediaEntries"
import { useFoodEntries } from "@/src/features/food/hooks/useFoodEntries"
import { useMediaMetrics } from "@/src/features/analytics/hooks/useMediaMetrics"
import { useFoodMetrics } from "@/src/features/analytics/hooks/useFoodMetrics"
import {
  applyFoodFilters,
  applyMediaFilters,
  defaultFoodFilters,
  defaultMediaFilters,
  extractFoodFilterOptions,
  extractMediaFilterOptions,
  type FoodFilterState,
  type MediaFilterState
} from "@/src/features/analytics/lib/filters"
import { DateRangeRow, MultiSelectChips } from "@/src/features/analytics/components/FilterChips"
import { SimpleBarList } from "@/src/features/analytics/components/SimpleBarList"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { FoodEntry } from "@/src/shared/types/database"

type AnalyticsTab = "media" | "food"
type FoodDrilldownDimension = "place" | "cuisine" | "itemCategory" | "city" | "month" | "rating"

interface FoodDrilldownSelection {
  dimension: FoodDrilldownDimension
  value: string
}

export function AnalyticsScreen() {
  const { palette } = useAppTheme()
  const [tab, setTab] = useState<AnalyticsTab>("media")

  const { data: media } = useMediaEntries()
  const { data: food } = useFoodEntries()

  const mediaEntries = media ?? []
  const foodEntries = food ?? []

  const [mediaFilters, setMediaFilters] = useState<MediaFilterState>(defaultMediaFilters)
  const [foodFilters, setFoodFilters] = useState<FoodFilterState>(defaultFoodFilters)
  const [foodDrilldown, setFoodDrilldown] = useState<FoodDrilldownSelection | null>(null)
  const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set())

  const mediaOptions = useMemo(() => extractMediaFilterOptions(mediaEntries), [mediaEntries])
  const foodOptions = useMemo(() => extractFoodFilterOptions(foodEntries), [foodEntries])

  const filteredMedia = useMemo(() => applyMediaFilters(mediaEntries, mediaFilters), [mediaEntries, mediaFilters])
  const filteredFood = useMemo(() => applyFoodFilters(foodEntries, foodFilters), [foodEntries, foodFilters])

  const mediaMetrics = useMediaMetrics(filteredMedia)
  const foodMetrics = useFoodMetrics(filteredFood)

  const drilldownEntries = useMemo(() => {
    if (!foodDrilldown) return []
    return filteredFood.filter((entry) => matchesFoodDrilldown(entry, foodDrilldown))
  }, [filteredFood, foodDrilldown])

  const drilldownByPlace = useMemo(() => {
    const grouped = new Map<string, FoodEntry[]>()
    for (const entry of drilldownEntries) {
      const placeKey = formatPlace(entry)
      const current = grouped.get(placeKey) ?? []
      current.push(entry)
      grouped.set(placeKey, current)
    }

    return Array.from(grouped.entries())
      .map(([place, entries]) => {
        const sorted = [...entries].sort((left, right) => right.visit_date.localeCompare(left.visit_date))
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>Analytics</Text>

      <View style={styles.tabRow}>
        <TabButton label="Media" active={tab === "media"} onPress={() => setTab("media")} />
        <TabButton label="Food" active={tab === "food"} onPress={() => setTab("food")} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 12 }}>
        {tab === "media" ? (
          <>
            <MediaFilterPanel filters={mediaFilters} setFilters={setMediaFilters} options={mediaOptions} />
            <KPIGrid
              rows={[
                { label: "Items", value: String(mediaMetrics.totalItems) },
                { label: "Spent", value: `$${mediaMetrics.totalSpent.toFixed(2)}` },
                { label: "Avg Rating", value: mediaMetrics.averageRating.toFixed(2) },
                { label: "Hours", value: mediaMetrics.totalHours.toFixed(1) },
                { label: "Top Genre", value: mediaMetrics.topGenre ?? "-" },
                { label: "Top Platform", value: mediaMetrics.topPlatform ?? "-" }
              ]}
            />

            <SimpleBarList
              title="Spent by Month"
              rows={mediaMetrics.spentByMonth.map((row) => ({ label: row.month, value: row.amount }))}
              formatValue={(value) => `$${value.toFixed(0)}`}
            />
            <SimpleBarList
              title="Minutes by Month"
              rows={mediaMetrics.minutesByMonth.map((row) => ({ label: row.month, value: row.minutes }))}
              formatValue={(value) => `${value.toFixed(0)}m`}
            />
            <SimpleBarList
              title="By Genre"
              rows={toSortedRows(mediaMetrics.countByGenre)}
            />
            <SimpleBarList
              title="By Status"
              rows={toSortedRows(mediaMetrics.countByStatus)}
            />
            <SimpleBarList
              title="By Language"
              rows={toSortedRows(mediaMetrics.countByLanguage)}
            />
          </>
        ) : (
          <>
            <FoodFilterPanel filters={foodFilters} setFilters={setFoodFilters} options={foodOptions} />
            <KPIGrid
              rows={[
                { label: "Visits", value: String(foodMetrics.totalVisits) },
                { label: "Spent", value: `$${foodMetrics.totalSpent.toFixed(2)}` },
                { label: "Avg Rating", value: foodMetrics.averageRating.toFixed(2) },
                { label: "Unique Places", value: String(foodMetrics.uniquePlaces) },
                { label: "Top City", value: foodMetrics.topCity ?? "-" },
                { label: "Top Cuisine", value: foodMetrics.topCuisine ?? "-" },
                {
                  label: "Would Return",
                  value: `${foodMetrics.totalVisits > 0 ? Math.round((foodMetrics.wouldReturnCount / foodMetrics.totalVisits) * 100) : 0}%`
                },
                { label: "Avg Food", value: foodMetrics.averageFoodRating.toFixed(2) }
              ]}
            />

            <SimpleBarList
              title="Visits by Month"
              rows={foodMetrics.countByMonth.map((row) => ({ label: row.month, value: row.count }))}
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
              rows={foodMetrics.spentByMonth.map((row) => ({ label: row.month, value: row.amount }))}
              formatValue={(value) => `$${value.toFixed(0)}`}
            />
            <SimpleBarList
              title="By Cuisine"
              rows={toSortedRows(foodMetrics.countByCuisine)}
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
              rows={toSortedRows(foodMetrics.countByItemCategory)}
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
              rows={foodMetrics.mostVisitedPlaces.map((row) => ({ label: row.name, value: row.count }))}
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )

  function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        style={[
          styles.tabButton,
          {
            borderColor: palette.border,
            backgroundColor: active ? palette.primary : palette.surface
          }
        ]}
        onPress={onPress}
      >
        <Text style={{ color: active ? palette.primaryText : palette.text, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    )
  }
}

function MediaFilterPanel({
  filters,
  setFilters,
  options
}: {
  filters: MediaFilterState
  setFilters: (next: MediaFilterState) => void
  options: ReturnType<typeof extractMediaFilterOptions>
}) {
  return (
    <View style={styles.filterBlock}>
      <DateRangeRow
        from={filters.dateFrom}
        to={filters.dateTo}
        onFromChange={(dateFrom) => setFilters({ ...filters, dateFrom })}
        onToChange={(dateTo) => setFilters({ ...filters, dateTo })}
      />
      <MultiSelectChips label="Medium" options={options.mediums} selected={filters.mediums} onToggle={(value) => toggle(value, filters.mediums, (mediums) => setFilters({ ...filters, mediums }))} />
      <MultiSelectChips label="Genre" options={options.genres} selected={filters.genres} onToggle={(value) => toggle(value, filters.genres, (genres) => setFilters({ ...filters, genres }))} />
      <MultiSelectChips label="Language" options={options.languages} selected={filters.languages} onToggle={(value) => toggle(value, filters.languages, (languages) => setFilters({ ...filters, languages }))} />
      <MultiSelectChips label="Platform" options={options.platforms} selected={filters.platforms} onToggle={(value) => toggle(value, filters.platforms, (platforms) => setFilters({ ...filters, platforms }))} />
      <MultiSelectChips label="Status" options={options.statuses} selected={filters.statuses} onToggle={(value) => toggle(value, filters.statuses, (statuses) => setFilters({ ...filters, statuses }))} />
      <MultiSelectChips label="Type" options={options.types} selected={filters.types} onToggle={(value) => toggle(value, filters.types, (types) => setFilters({ ...filters, types }))} />
    </View>
  )
}

function FoodFilterPanel({
  filters,
  setFilters,
  options
}: {
  filters: FoodFilterState
  setFilters: (next: FoodFilterState) => void
  options: ReturnType<typeof extractFoodFilterOptions>
}) {
  return (
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
      <MultiSelectChips label="Dining Type" options={options.diningTypes} selected={filters.diningTypes} onToggle={(value) => toggle(value, filters.diningTypes, (diningTypes) => setFilters({ ...filters, diningTypes }))} />
      <MultiSelectChips label="City" options={options.cities} selected={filters.cities} onToggle={(value) => toggle(value, filters.cities, (cities) => setFilters({ ...filters, cities }))} />
      <MultiSelectChips
        label="Min Rating"
        options={["4+", "5"]}
        selected={filters.minRating == null ? [] : [filters.minRating === 5 ? "5" : "4+"]}
        onToggle={(value) =>
          setFilters({
            ...filters,
            minRating: filters.minRating === (value === "5" ? 5 : 4) ? null : value === "5" ? 5 : 4
          })
        }
      />
      <MultiSelectChips
        label="Would Return"
        options={["Yes", "No"]}
        selected={filters.wouldReturn == null ? [] : [filters.wouldReturn ? "Yes" : "No"]}
        onToggle={(value) =>
          setFilters({
            ...filters,
            wouldReturn:
              filters.wouldReturn === (value === "Yes")
                ? null
                : value === "Yes"
          })
        }
      />
    </View>
  )
}

function KPIGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  const { palette } = useAppTheme()
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.label} style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>{row.label}</Text>
          <Text style={[styles.kpiValue, { color: palette.text }]}>{row.value}</Text>
        </View>
      ))}
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
        <Text style={[styles.blockTitle, { color: palette.text }]}>
          Drilldown: {selection.dimension} = {selection.value}
        </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  blockTitle: { fontSize: 14, fontWeight: "700" },
  filterBlock: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiCard: { width: "48%", borderWidth: 1, borderRadius: 12, padding: 10 },
  kpiLabel: { fontSize: 11, marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: "700" },
  drilldownCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  drilldownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  clearButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  drilldownGroup: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  drilldownGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  drilldownPlace: { fontSize: 13, fontWeight: "700", flex: 1 },
  drilldownMeta: { fontSize: 12 },
  drilldownEntryRow: { borderTopWidth: 1, paddingTop: 6, gap: 2 },
  drilldownEntryTitle: { fontSize: 12, fontWeight: "600" }
})
