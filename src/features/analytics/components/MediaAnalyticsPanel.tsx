import { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { DateRangeRow, MultiSelectChips } from "@/src/features/analytics/components/FilterChips"
import { KPIGrid } from "@/src/features/analytics/components/KPIGrid"
import { SimpleBarList } from "@/src/features/analytics/components/SimpleBarList"
import {
  applyMediaFilters,
  defaultMediaFilters,
  extractMediaFilterOptions,
  type MediaFilterState
} from "@/src/features/analytics/lib/filters"
import { useMediaMetrics } from "@/src/features/analytics/hooks/useMediaMetrics"
import type { MediaEntry } from "@/src/shared/types/database"

interface MediaAnalyticsPanelProps {
  entries: MediaEntry[]
}

export function MediaAnalyticsPanel({ entries }: MediaAnalyticsPanelProps) {
  const [filters, setFilters] = useState<MediaFilterState>(defaultMediaFilters)

  const options = useMemo(() => extractMediaFilterOptions(entries), [entries])
  const filtered = useMemo(() => applyMediaFilters(entries, filters), [entries, filters])
  const metrics = useMediaMetrics(filtered)

  return (
    <View style={styles.root}>
      <View style={styles.filterBlock}>
        <DateRangeRow
          from={filters.dateFrom}
          to={filters.dateTo}
          onFromChange={(dateFrom) => setFilters({ ...filters, dateFrom })}
          onToChange={(dateTo) => setFilters({ ...filters, dateTo })}
        />
        <MultiSelectChips
          label="Medium"
          options={options.mediums}
          selected={filters.mediums}
          onToggle={(value) => toggle(value, filters.mediums, (mediums) => setFilters({ ...filters, mediums }))}
        />
        <MultiSelectChips
          label="Genre"
          options={options.genres}
          selected={filters.genres}
          onToggle={(value) => toggle(value, filters.genres, (genres) => setFilters({ ...filters, genres }))}
        />
        <MultiSelectChips
          label="Language"
          options={options.languages}
          selected={filters.languages}
          onToggle={(value) => toggle(value, filters.languages, (languages) => setFilters({ ...filters, languages }))}
        />
        <MultiSelectChips
          label="Platform"
          options={options.platforms}
          selected={filters.platforms}
          onToggle={(value) => toggle(value, filters.platforms, (platforms) => setFilters({ ...filters, platforms }))}
        />
        <MultiSelectChips
          label="Status"
          options={options.statuses}
          selected={filters.statuses}
          onToggle={(value) => toggle(value, filters.statuses, (statuses) => setFilters({ ...filters, statuses }))}
        />
      </View>

      <KPIGrid
        rows={[
          { label: "items", value: String(metrics.totalItems) },
          { label: "spent", value: `$${metrics.totalSpent.toFixed(2)}` },
          { label: "avg rating", value: metrics.averageRating.toFixed(2) },
          { label: "hours", value: metrics.totalHours.toFixed(1) },
          { label: "top genre", value: metrics.topGenre ?? "-" },
          { label: "top platform", value: metrics.topPlatform ?? "-" }
        ]}
      />

      <SimpleBarList
        title="Spent by Month"
        rows={metrics.spentByMonth.map((row) => ({ label: row.month, value: row.amount }))}
        formatValue={(value) => `$${value.toFixed(0)}`}
      />
      <SimpleBarList
        title="Minutes by Month"
        rows={metrics.minutesByMonth.map((row) => ({ label: row.month, value: row.minutes }))}
        formatValue={(value) => `${value.toFixed(0)}m`}
      />
      <SimpleBarList title="By Genre" rows={toSortedRows(metrics.countByGenre)} />
      <SimpleBarList title="By Status" rows={toSortedRows(metrics.countByStatus)} />
      <SimpleBarList title="By Language" rows={toSortedRows(metrics.countByLanguage)} />
      <SimpleBarList title="By Type" rows={toSortedRows(metrics.countByType)} />
    </View>
  )
}

function toggle(value: string, selected: string[], onChange: (next: string[]) => void) {
  if (selected.includes(value)) {
    onChange(selected.filter((item) => item !== value))
  } else {
    onChange([...selected, value])
  }
}

function toSortedRows(record: Record<string, number>) {
  return Object.entries(record)
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
}

const styles = StyleSheet.create({
  root: {
    gap: 12
  },
  filterBlock: {
    gap: 8
  }
})
