"use client"

import { formatNumber } from "@/lib/parsing-utils"
import { GenericAnalyticsDashboard, KPIConfig, ChartConfig } from "./GenericAnalyticsDashboard"

interface BookMetrics {
    totalBooks: number
    finishedCount: number
    totalPagesRead: number
    averageRating: number
    countByStatus: Record<string, number>
    countByFormat: Record<string, number>
    countByGenre: Record<string, number>
    booksPerMonth: { name: string; value: number }[]
    pagesPerMonth: { name: string; value: number }[]
}

interface BookAnalyticsChartsProps {
    metrics: BookMetrics
}

function transformRecord(record: Record<string, number>): { name: string; value: number }[] {
    return Object.entries(record)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
}

export function BookAnalyticsCharts({ metrics }: BookAnalyticsChartsProps) {
    const kpis: KPIConfig[] = [
        { label: "Total Books", value: metrics.totalBooks },
        { label: "Finished", value: metrics.finishedCount },
        { label: "Pages Read", value: formatNumber(metrics.totalPagesRead) },
        {
            label: "Avg Rating",
            value: metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : "—"
        },
    ]

    const charts: ChartConfig[] = [
        {
            title: "Books Finished per Month",
            type: "bar",
            data: metrics.booksPerMonth,
            layout: "horizontal",
            valueLabel: "Books"
        },
        {
            title: "Pages Read per Month",
            type: "bar",
            data: metrics.pagesPerMonth,
            layout: "horizontal",
            valueLabel: "Pages"
        },
        {
            title: "By Status",
            type: "pie",
            data: transformRecord(metrics.countByStatus),
            valueLabel: "Books"
        },
        {
            title: "By Format",
            type: "pie",
            data: transformRecord(metrics.countByFormat),
            valueLabel: "Books"
        },
        {
            title: "By Genre",
            type: "pie",
            data: transformRecord(metrics.countByGenre),
            valueLabel: "Books"
        }
    ]

    return <GenericAnalyticsDashboard kpis={kpis} charts={charts} />
}
