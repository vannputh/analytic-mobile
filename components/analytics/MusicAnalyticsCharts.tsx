"use client"

import { formatNumber } from "@/lib/parsing-utils"
import { GenericAnalyticsDashboard, KPIConfig, ChartConfig } from "./GenericAnalyticsDashboard"

interface MusicMetrics {
    totalEntries: number
    totalMinutesListened: number
    averageRating: number
    countByStatus: Record<string, number>
    countByType: Record<string, number>
    countByPlatform: Record<string, number>
    countByGenre: Record<string, number>
    topArtists: { name: string; value: number }[]
}

interface MusicAnalyticsChartsProps {
    metrics: MusicMetrics
}

function transformRecord(record: Record<string, number>): { name: string; value: number }[] {
    return Object.entries(record)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
}

export function MusicAnalyticsCharts({ metrics }: MusicAnalyticsChartsProps) {
    const kpis: KPIConfig[] = [
        { label: "Total Tracks/Albums", value: metrics.totalEntries },
        {
            label: "Listening Time",
            value: `${formatNumber(Math.floor(metrics.totalMinutesListened / 60), 1)} h`,
            subValue: `${formatNumber(metrics.totalMinutesListened)} mins`
        },
        {
            label: "Avg Rating",
            value: metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : "—"
        },
        {
            label: "Top Genre",
            value: Object.entries(metrics.countByGenre).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
        },
    ]

    const charts: ChartConfig[] = [
        {
            title: "Top Artists",
            type: "bar",
            data: metrics.topArtists,
            layout: "vertical",
            valueLabel: "Count"
        },
        {
            title: "By Type",
            type: "pie",
            data: transformRecord(metrics.countByType),
            valueLabel: "Items"
        },
        {
            title: "By Platform",
            type: "pie",
            data: transformRecord(metrics.countByPlatform),
            valueLabel: "Items"
        },
        {
            title: "By Genre",
            type: "pie",
            data: transformRecord(metrics.countByGenre),
            valueLabel: "Items"
        }
    ]

    return <GenericAnalyticsDashboard kpis={kpis} charts={charts} />
}
