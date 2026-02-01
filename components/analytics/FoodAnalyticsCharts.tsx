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
import { DINING_OPTIONS } from "@/lib/food-types"

type OnDrillDown = (dimension: string, value: string, label: string) => void

interface FoodAnalyticsChartsProps {
    metrics: FoodMetrics
    onDrillDown?: OnDrillDown
}

// Visits by Month Chart
function VisitsByMonthChart({
    data,
    onDrillDown,
}: {
    data: { month: string; count: number }[]
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        return data.map((d) => ({
            month: formatMonthLabel(d.month),
            monthKey: d.month,
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
                <Bar
                    dataKey="count"
                    fill={ACCENT_COLOR}
                    radius={[2, 2, 0, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { monthKey?: string; month?: string } | undefined
                        if (p?.monthKey) onDrillDown?.("month", p.monthKey, p.month ?? p.monthKey)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
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
function CuisineTreemap({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
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
                    const label = name ?? ""
                    // Deterministic color based on name
                    const colorIndex = Math.abs(label.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % TREEMAP_COLORS.length
                    const fill = TREEMAP_COLORS[colorIndex]

                    return (
                        <g
                            onClick={() => onDrillDown?.("cuisine", label, label)}
                            style={{ cursor: onDrillDown ? "pointer" : undefined }}
                        >
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
                                {label}
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
function MostVisitedChart({
    data,
    onDrillDown,
}: {
    data: { name: string; count: number; avgRating: number }[]
    onDrillDown?: OnDrillDown
}) {
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
                    domain={[0, "auto"]}
                    allowDecimals={false}
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
                <Bar
                    dataKey="count"
                    fill={ACCENT_COLOR}
                    radius={[0, 2, 2, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { name?: string } | undefined
                        if (p?.name) onDrillDown?.("place", p.name, p.name)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Rating Distribution Chart
function RatingDistributionChart({
    data,
    onDrillDown,
}: {
    data: { rating: number; count: number }[]
    onDrillDown?: OnDrillDown
}) {
    if (data.length === 0) {
        return <div className={emptyStateClass}>No rating data</div>
    }

    // Ensure we have all ratings 1-5 represented
    const fullData = Array.from({ length: 5 }, (_, i) => {
        const rating = i + 1
        const found = data.find((d) => d.rating === rating)
        return { rating: `${rating}★`, ratingKey: rating, count: found?.count || 0 }
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
                <Bar
                    dataKey="count"
                    fill={ACCENT_COLOR}
                    radius={[2, 2, 0, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { ratingKey?: number; rating?: string } | undefined
                        if (p?.ratingKey != null) onDrillDown?.("rating", String(p.ratingKey), p.rating ?? String(p.ratingKey))
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Spending by Cuisine (bar, top N, currency)
function SpendingByCuisineChart({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        return Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No spending by cuisine</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} layout="vertical">
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} horizontal={false} />
                <XAxis type="number" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0, 0%, 96%)" }} formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Spent"]} />
                <Bar
                    dataKey="amount"
                    fill={ACCENT_COLOR}
                    radius={[0, 2, 2, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { name?: string } | undefined
                        if (p?.name) onDrillDown?.("cuisine", p.name, p.name)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Spending by Item Category (bar, top N, currency)
function SpendingByItemCategoryChart({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        return Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No spending by food type</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} layout="vertical">
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} horizontal={false} />
                <XAxis type="number" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0, 0%, 96%)" }} formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Spent"]} />
                <Bar
                    dataKey="amount"
                    fill={ACCENT_COLOR}
                    radius={[0, 2, 2, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { name?: string } | undefined
                        if (p?.name) onDrillDown?.("itemCategory", p.name, p.name)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Visits by City (bar, top N)
function VisitsByCityChart({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        return Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No city data</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} vertical={false} />
                <XAxis dataKey="name" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} interval={0} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0, 0%, 96%)" }} formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Visits"]} />
                <Bar
                    dataKey="count"
                    fill={ACCENT_COLOR}
                    radius={[2, 2, 0, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { name?: string } | undefined
                        if (p?.name) onDrillDown?.("city", p.name, p.name)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Visits by Dining Type (pie with label mapping)
function VisitsByDiningTypeChart({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        const labelMap: Record<string, string> = {}
        DINING_OPTIONS.forEach((o) => {
            labelMap[o.value] = o.label
        })
        return Object.entries(data)
            .map(([key, value]) => ({ name: labelMap[key] ?? key, value, drillValue: key }))
            .filter((d) => d.value > 0)
            .sort((a, b) => b.value - a.value)
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No dining type data</div>
    }

    return (
        <SimplePieChart
            data={chartData}
            title="Dining type"
            valueLabel="Visits"
            limitItems={5}
            onSegmentClick={(segment) => {
                const value = (segment as { drillValue?: string }).drillValue ?? segment.name
                onDrillDown?.("diningType", value, segment.name)
            }}
        />
    )
}

// Top Tags (bar, top N)
function TopTagsChart({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        return Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No tags data</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} layout="vertical">
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} horizontal={false} />
                <XAxis type="number" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} width={90} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0, 0%, 96%)" }} formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Visits"]} />
                <Bar
                    dataKey="count"
                    fill={ACCENT_COLOR}
                    radius={[0, 2, 2, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { name?: string } | undefined
                        if (p?.name) onDrillDown?.("tag", p.name, p.name)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Sub-ratings breakdown (horizontal bars: Food, Ambiance, Service, Value)
function SubRatingsBreakdownChart({ metrics }: { metrics: FoodMetrics }) {
    const hasAny =
        metrics.averageFoodRating > 0 ||
        metrics.averageAmbianceRating > 0 ||
        metrics.averageServiceRating > 0 ||
        metrics.averageValueRating > 0

    if (!hasAny) {
        return <div className={emptyStateClass}>No sub-ratings data</div>
    }

    const chartData = useMemo(() => {
        const items: { name: string; value: number }[] = []
        if (metrics.averageFoodRating > 0) items.push({ name: "Food", value: metrics.averageFoodRating })
        if (metrics.averageAmbianceRating > 0) items.push({ name: "Ambiance", value: metrics.averageAmbianceRating })
        if (metrics.averageServiceRating > 0) items.push({ name: "Service", value: metrics.averageServiceRating })
        if (metrics.averageValueRating > 0) items.push({ name: "Value", value: metrics.averageValueRating })
        return items
    }, [metrics])

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }} layout="vertical">
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} horizontal={false} />
                <XAxis type="number" domain={[0, 5]} tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} width={70} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0, 0%, 96%)" }} formatter={(value: number | undefined) => [value != null ? value.toFixed(1) : "—", "Avg"]} />
                <Bar dataKey="value" fill={ACCENT_COLOR} radius={[0, 2, 2, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// Visits by Neighborhood (optional bar, top N)
function VisitsByNeighborhoodChart({
    data,
    onDrillDown,
}: {
    data: Record<string, number>
    onDrillDown?: OnDrillDown
}) {
    const chartData = useMemo(() => {
        return Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }))
    }, [data])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>No neighborhood data</div>
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} layout="vertical">
                <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} stroke={gridStyle.stroke} horizontal={false} />
                <XAxis type="number" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} />
                <YAxis type="category" dataKey="name" tick={{ ...tickStyle }} tickLine={false} axisLine={{ stroke: axisStyle.stroke }} width={100} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0, 0%, 96%)" }} formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Visits"]} />
                <Bar
                    dataKey="count"
                    fill={ACCENT_COLOR}
                    radius={[0, 2, 2, 0]}
                    onClick={(item) => {
                        const p = item?.payload as { name?: string } | undefined
                        if (p?.name) onDrillDown?.("neighborhood", p.name, p.name)
                    }}
                    style={{ cursor: onDrillDown ? "pointer" : undefined }}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground pt-2 first:pt-0 pb-1">
            {children}
        </h2>
    )
}

export function FoodAnalyticsCharts({ metrics, onDrillDown }: FoodAnalyticsChartsProps) {
    return (
        <div className="space-y-6">
            {/* Overview */}
            <div className="space-y-2">
                <SectionHeading>Overview</SectionHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Visits · By Month
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <VisitsByMonthChart data={metrics.countByMonth} onDrillDown={onDrillDown} />
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
            </div>

            {/* Spending */}
            <div className="space-y-2">
                <SectionHeading>Spending</SectionHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Spending · By Cuisine
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SpendingByCuisineChart data={metrics.spentByCuisine} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Spending · By Food Type
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SpendingByItemCategoryChart data={metrics.spentByItemCategory} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
                <SectionHeading>Location</SectionHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Visits · By City
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <VisitsByCityChart data={metrics.countByCity} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Visits · By Neighborhood
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <VisitsByNeighborhoodChart data={metrics.countByNeighborhood} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Behavior */}
            <div className="space-y-2">
                <SectionHeading>Behavior</SectionHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Visits · By Dining Type
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <VisitsByDiningTypeChart data={metrics.countByDiningType} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Top Tags
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <TopTagsChart data={metrics.countByTag} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Ratings */}
            <div className="space-y-2">
                <SectionHeading>Ratings</SectionHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Rating Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <RatingDistributionChart data={metrics.ratingDistribution} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Sub-ratings breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SubRatingsBreakdownChart metrics={metrics} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Places */}
            <div className="space-y-2">
                <SectionHeading>Places</SectionHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Cuisine Types
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <CuisineTreemap data={metrics.countByCuisine} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                Most Visited Places
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <MostVisitedChart data={metrics.mostVisitedPlaces} onDrillDown={onDrillDown} />
                        </CardContent>
                    </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                By Food Type
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SimplePieChart
                                data={metrics.countByItemCategory}
                                title="Food Type"
                                valueLabel="Visits"
                                onSegmentClick={(segment) => onDrillDown?.("itemCategory", segment.name, segment.name)}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                By Category
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SimplePieChart
                                data={metrics.countByCategory}
                                title="Category"
                                valueLabel="Visits"
                                onSegmentClick={(segment) => onDrillDown?.("category", segment.name, segment.name)}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default FoodAnalyticsCharts
