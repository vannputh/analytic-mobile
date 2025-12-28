"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
import { formatNumber, formatCurrency, formatDuration } from "@/lib/parsing-utils"

interface AnalyticsChartsProps {
  metrics: MediaMetrics
}

// Monochrome palette with accent
const CHART_COLORS = [
  "hsl(0, 0%, 15%)",
  "hsl(0, 0%, 30%)",
  "hsl(0, 0%, 45%)",
  "hsl(0, 0%, 60%)",
  "hsl(0, 0%, 75%)",
  "hsl(0, 0%, 85%)",
]

const ACCENT_COLOR = "hsl(0, 0%, 10%)"

// Custom tooltip style
const tooltipStyle = {
  backgroundColor: "hsl(0, 0%, 98%)",
  border: "1px solid hsl(0, 0%, 90%)",
  borderRadius: "4px",
  padding: "8px 12px",
  fontSize: "12px",
  fontFamily: "monospace",
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-")
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${monthNames[parseInt(m, 10) - 1]} ${year.slice(2)}`
}

interface TimelineChartProps {
  data: { month: string; minutes: number }[]
}

function TimelineChart({ data }: TimelineChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      month: formatMonthLabel(d.month),
      hours: Math.round(d.minutes / 60 * 10) / 10,
      minutes: d.minutes,
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono">
        No time data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number | undefined, name: string | undefined) => [
            value !== undefined && name === "hours" ? `${value}h (${formatDuration(value * 60)})` : value ?? 0,
            "Time",
          ]}
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke={ACCENT_COLOR}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#timeGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
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

interface GenrePieChartProps {
  data: Record<string, number>
  title: string
}

function GenrePieChart({ data, title }: GenrePieChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono">
        No {title.toLowerCase()} data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine={{ stroke: "hsl(0, 0%, 60%)", strokeWidth: 1 }}
        >
          {chartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Items"]}
        />
      </PieChart>
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

interface CountByMonthChartProps {
  data: { month: string; count: number }[]
}

function CountByMonthChart({ data }: CountByMonthChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      month: formatMonthLabel(d.month),
      count: d.count,
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm font-mono">
        No completion data
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
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number | undefined) => [formatNumber(value ?? 0), "Items"]}
        />
        <Bar dataKey="count" fill={ACCENT_COLOR} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AnalyticsCharts({ metrics }: AnalyticsChartsProps) {
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
            <TimelineChart data={metrics.minutesByMonth} />
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
            <CountByMonthChart data={metrics.countByMonth} />
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

      {/* Tertiary row: Pie charts - 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Language
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <GenrePieChart data={metrics.countByLanguage} title="Language" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Medium
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <GenrePieChart data={metrics.countByMedium} title="Medium" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <GenrePieChart data={metrics.countByPlatform} title="Platform" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
              By Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <GenrePieChart data={metrics.countByStatus} title="Status" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalyticsCharts

