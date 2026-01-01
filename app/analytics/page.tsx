"use client"

import { useState, useEffect, useMemo } from "react"
import { getEntries } from "@/lib/actions"
import { MediaEntry } from "@/lib/database.types"
import { FilterState, defaultFilterState, applyFilters, extractFilterOptions } from "@/lib/filter-types"
import { useMediaMetrics } from "@/hooks/useMediaMetrics"
import { KPIGrid } from "@/components/analytics/KPIGrid"
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts"
import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar"
import { Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AnalyticsSkeleton } from "@/components/skeletons"
import { PageHeader } from "@/components/page-header"

export default function AnalyticsPage() {
  const [entries, setEntries] = useState<MediaEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)

  useEffect(() => {
    let isMounted = true

    async function fetchEntries() {
      try {
        setLoading(true)
        setError(null)

        // Use optimized server action instead of direct Supabase query
        const result = await getEntries()

        if (!isMounted) return

        if (!result.success) {
          throw new Error(result.error || "Failed to load entries")
        }

        setEntries(result.data || [])
      } catch (err) {
        if (!isMounted) return

        console.error("Failed to fetch entries:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to load entries"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchEntries()

    return () => {
      isMounted = false
    }
  }, [])

  // Extract filter options from raw data
  const filterOptions = useMemo(() => extractFilterOptions(entries), [entries])

  // Apply filters to entries
  const filteredEntries = useMemo(() => applyFilters(entries, filters), [entries, filters])

  // Calculate metrics from filtered entries
  const metrics = useMediaMetrics(filteredEntries)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Analytics" />
        <main className="p-4 sm:p-6">
          <AnalyticsSkeleton />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-mono">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PageHeader title="Analytics" />

      {/* Global Filter Bar */}
      {entries.length > 0 && (
        <GlobalFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          options={filterOptions}
          totalCount={entries.length}
          filteredCount={filteredEntries.length}
        />
      )}

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="h-12 w-12 opacity-30 mb-4" />
            <p className="text-sm font-mono mb-3">No entries yet</p>
            <Button asChild>
              <Link href="/import">Import CSV</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Grid */}
            <KPIGrid metrics={metrics} />

            {/* Charts */}
            <AnalyticsCharts metrics={metrics} />
          </div>
        )}
      </main>
    </div>
  )
}
