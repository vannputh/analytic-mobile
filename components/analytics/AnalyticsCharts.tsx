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
  Legend,
  Treemap,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MediaMetrics } from "@/hooks/useMediaMetrics"
import { formatCurrency, formatDuration } from "@/lib/parsing-utils"
import {
  CHART_COLORS,
  ACCENT_COLOR,
  tooltipStyle,
  formatMonthLabel,
  formatNumber,
  AreaChartBase,
  SimpleBarChart,
  SimplePieChart,
} from "@/components/charts"

interface AnalyticsChartsProps {
  metrics: MediaMetrics
}

interface CostChartProps {
  data: { month: string; amount: number; byMedium: Record<string, number> }[]
}

function CostChart({ data }: CostChartProps) {
  const { chartData, mediums } = useMemo(() => {
    const allMediums = new Set<string>()
    data.forEach((d) => {
      Object.keys(d.byMedium).forEach((m) => allMediums.add(m))
    })
    const mediumList = Array.from(allMediums)

    const processed = data.map((d) => {
      const entry: Record<string, string | number> = {
        month: formatMonthLabel(d.month),
        total: d.amount,
      }
      mediumList.forEach((m) => {
        entry[m] = d.byMedium[m] || 0
      })
      return entry
    })

    return { chartData: processed, mediums: mediumList }
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono">
        No spending data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(0, 0%, 80%)" }}
        />
        <YAxis
          tick={{ fontSize: 10, fontFamily: "monospace" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(0, 0%, 80%)" }}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Spent"]}
        />
        <Legend
          wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }}
        />
        {mediums.map((medium, i) => (
          <Bar
            key={medium}
            dataKey={medium}
            stackId="cost"
            fill={CHART_COLORS[i % CHART_COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

interface TreemapChartProps {
  data: Record<string, number>
  title: string
}

function TreemapChart({ data, title }: TreemapChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, size: value }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono">
        No {title.toLowerCase()} data
      </div>
    )
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
          if (width < 40 || height < 30) return <g />
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={CHART_COLORS[Math.abs(name?.toString().charCodeAt(0) || 0) % CHART_COLORS.length]}
                stroke="hsl(0, 0%, 100%)"
                strokeWidth={2}
              />
              <text
                x={x + width / 2}
                y={y + height / 2 - 6}
                textAnchor="middle"
                fill="hsl(0, 0%, 100%)"
                fontSize={11}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {name}
              </text>
              <text
                x={x + width / 2}
                y={y + height / 2 + 8}
                textAnchor="middle"
                fill="hsl(0, 0%, 85%)"
                fontSize={10}
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
          formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Items"]}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}

export function AnalyticsCharts({ metrics }: AnalyticsChartsProps) {
  // Memoize data for shared components
  const timelineData = useMemo(() => {
    return metrics.minutesByMonth.map(d => ({
      month: formatMonthLabel(d.month),
      hours: Math.round(d.minutes / 60 * 10) / 10
    }))
  }, [metrics.minutesByMonth])

  const completionData = useMemo(() => {
    return metrics.countByMonth.map(d => ({
      name: formatMonthLabel(d.month),
      value: d.count
    }))
  }, [metrics.countByMonth])

  return (
    <div className="space-y-4">
      {/* Main row: Timeline and Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              The Timeline · Hours by Month
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <AreaChartBase
              data={timelineData}
              xAxisKey="month"
              dataKey="hours"
              height={280}
              valueFormatter={(v) => `${v}h`}
              valueLabel="Time"
              formatYLabel={(v) => `${v}h`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              The Cost · Spending by Month
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CostChart data={metrics.spentByMonth} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary row: Completions and Genres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              Items Completed · By Month
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SimpleBarChart
              data={completionData}
              layout="horizontal"
              height={280}
              valueLabel="Items"
              showXAxis={true}
              showYAxis={true}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              The Obsession · Genres
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TreemapChart data={metrics.countByGenre} title="Genre" />
          </CardContent>
        </Card>
      </div>

      {/* Tertiary row: Pie charts - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Language
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SimplePieChart data={metrics.countByLanguage} title="Language" height={360} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SimplePieChart data={metrics.countByPlatform} title="Platform" height={360} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SimplePieChart data={metrics.countByStatus} title="Status" height={360} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalyticsCharts
