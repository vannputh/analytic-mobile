"use client"

import { useMemo } from "react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"
import {
    ACCENT_COLOR,
    tooltipStyle,
    gridStyle,
    tickStyle,
    axisStyle,
    emptyStateClass,
    formatMonthLabel,
} from "./chart-config"

interface AreaChartBaseProps<T> {
    data: T[]
    dataKey: keyof T
    xAxisKey: keyof T
    height?: number
    formatXLabel?: (value: string) => string
    formatYLabel?: (value: number) => string
    valueFormatter?: (value: number) => string
    valueLabel?: string
    gradientId?: string
    emptyMessage?: string
}

export function AreaChartBase<T extends Record<string, unknown>>({
    data,
    dataKey,
    xAxisKey,
    height = 280,
    formatXLabel = formatMonthLabel,
    formatYLabel,
    valueFormatter = (v) => v.toLocaleString(),
    valueLabel = "Value",
    gradientId = "areaGradient",
    emptyMessage = "No data available",
}: AreaChartBaseProps<T>) {
    const chartData = useMemo(() => {
        return data.map((d) => ({
            ...d,
            xLabel: formatXLabel(String(d[xAxisKey])),
        }))
    }, [data, xAxisKey, formatXLabel])

    if (chartData.length === 0) {
        return <div className={emptyStateClass}>{emptyMessage}</div>
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray={gridStyle.strokeDasharray}
                    stroke={gridStyle.stroke}
                    vertical={false}
                />
                <XAxis
                    dataKey="xLabel"
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
                    tickFormatter={formatYLabel}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined) => [valueFormatter(value ?? 0), valueLabel]}
                />
                <Area
                    type="monotone"
                    dataKey={dataKey as string}
                    stroke={ACCENT_COLOR}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export default AreaChartBase
