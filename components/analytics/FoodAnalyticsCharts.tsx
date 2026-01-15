"use client"

import { useMemo } from "react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Treemap,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FoodMetrics } from "@/hooks/useFoodMetrics"
import {
    CHART_COLORS,
    TREEMAP_COLORS,
    ACCENT_COLOR,
    tooltipStyle,
    gridStyle,
    tickStyle,
    axisStyle,
    formatMonthLabel,
    formatCurrency,
    formatNumber,
    emptyStateClass,
} from "@/components/charts"
import { SimplePieChart } from "@/components/charts/SimplePieChart"
import { AreaChartBase } from "@/components/charts/AreaChartBase"

interface FoodAnalyticsChartsProps {
    metrics: FoodMetrics
}

// Visits by Month Chart
function VisitsByMonthChart({ data }: { data: { month: string; count: number }[] }) {
    const chartData = useMemo(() => {
        return data.map((d) => ({
            month: formatMonthLabel(d.month),
            count: d.count,
        }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No visit data available</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} vertical={false} />
                <XAxis
                    dataKey="month"
                    tick={{ ...tickStyle }}
                    tickLine={false}
                    axisLine={{ stroke: axisStyle.stroke }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                />
                <YAxis
                    tick={{ ...tickStyle }}
                    tickLine={false}
                    axisLine={{ stroke: axisStyle.stroke }}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "hsl(0, 0%, 96%)" }}
                    formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Visits"]}
                />
                <Bar dataKey="count" fill={ACCENT_COLOR} radius={[2, 2, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Spending by Month Chart - using AreaChartBase
function SpendingByMonthChart({ data }: { data: { month: string; amount: number }[] }) {
    const chartData = useMemo(() => {
        return data.map((d) => ({
            month: d.month,
            amount: Math.round(d.amount),
        }))
    }, [data])

    return (
        <AreaChartBase
            data={chartData}
            dataKey="amount"
            xAxisKey="month"
            valueFormatter={formatCurrency}
            valueLabel="Spent"
            formatYLabel={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
            gradientId="spendingGradient"
            emptyMessage="No spending data available"
        />
    )
}

// Cuisine Types Treemap
function CuisineTreemap({ data }: { data: Record<string, number> }) {
    const chartData = useMemo(() => {
        return Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([name, value]) => ({ name, size: value }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No cuisine data</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <Treemap
                data={chartData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="hsl(0, 0%, 100%)"
                fill={ACCENT_COLOR}
                content={({ x, y, width, height, name, value }) => {
                    if (width < 50 || height < 40) return <g />
                    // Deterministic color based on name
                    const colorIndex = Math.abs(name?.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 0) % TREEMAP_COLORS.length
                    const fill = TREEMAP_COLORS[colorIndex]

                    return (
                        <g>
                            <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={fill}
                                stroke="hsl(0, 0%, 100%)"
                                strokeWidth={2}
                            />
                            <text
                                x={x + width / 2}
                                y={y + height / 2 - 6}
                                textAnchor="middle"
                                fill="hsl(0, 0%, 100%)"
                                fontSize={10}
                                fontFamily="monospace"
                                fontWeight="bold"
                            >
                                {name}
                            </text>
                            <text
                                x={x + width / 2}
                                y={y + height / 2 + 8}
                                textAnchor="middle"
                                fill="hsl(0, 0%, 80%)"
                                fontSize={9}
                                fontFamily="monospace"
                            >
                                {value}
                            </text>
                        </g>
                    )
                }}
            >
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Visits"]}
                />
            </Treemap>
        </ResponsiveContainer>
    )
}

// Most Visited Places Chart
function MostVisitedChart({ data }: { data: { name: string; count: number; avgRating: number }[] }) {
    if (data.length === 0) {
        return <div className={emptyStateClass}>No visit data</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart
                data={data.slice(0, 8)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} horizontal={false} />
                <XAxis
                    type="number"
                    tick={{ ...tickStyle }}
                    tickLine={false}
                    axisLine={{ stroke: axisStyle.stroke }}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ ...tickStyle }}
                    tickLine={false}
                    axisLine={{ stroke: axisStyle.stroke }}
                    width={100}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "hsl(0, 0%, 96%)" }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                        const v = value ?? 0
                        if (name === "count") return [v, "Visits"]
                        if (name === "avgRating") return [v.toFixed(1), "Avg Rating"]
                        return [v, name ?? ""]
                    }}
                />
                <Bar dataKey="count" fill={ACCENT_COLOR} radius={[0, 2, 2, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Rating Distribution Chart
function RatingDistributionChart({ data }: { data: { rating: number; count: number }[] }) {
    if (data.length === 0) {
        return <div className={emptyStateClass}>No rating data</div>
    }

    // Ensure we have all ratings 1-5 represented
    const fullData = Array.from({ length: 5 }, (_, i) => {
        const rating = i + 1
        const found = data.find((d) => d.rating === rating)
        return { rating: `${rating}★`, count: found?.count || 0 }
    })

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fullData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} />
                <XAxis
                    dataKey="rating"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Entries"]}
                />
                <Bar dataKey="count" fill={ACCENT_COLOR} radius={[2, 2, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

export function FoodAnalyticsCharts({ metrics }: FoodAnalyticsChartsProps) {
    return (
        <div className="space-y-4">
            {/* Main row: Visits and Spending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            Visits · By Month
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <VisitsByMonthChart data={metrics.countByMonth} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            Spending · By Month
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <SpendingByMonthChart data={metrics.spentByMonth} />
                    </CardContent>
                </Card>
            </div>

            {/* Secondary row: Cuisine and Most Visited */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            Cuisine Types
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <CuisineTreemap data={metrics.countByCuisine} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            Most Visited Places
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <MostVisitedChart data={metrics.mostVisitedPlaces} />
                    </CardContent>
                </Card>
            </div>

            {/* Tertiary row: Pie charts - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            By Food Type
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <SimplePieChart data={metrics.countByItemCategory} title="Food Type" valueLabel="Visits" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            By Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <SimplePieChart data={metrics.countByCategory} title="Category" valueLabel="Visits" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                            Rating Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <RatingDistributionChart data={metrics.ratingDistribution} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default FoodAnalyticsCharts
