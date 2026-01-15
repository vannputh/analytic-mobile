"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"
import { ACCENT_COLOR, tooltipStyle, gridStyle, tickStyle, axisStyle, emptyStateClass } from "./chart-config"

interface SimpleBarChartProps {
    data: { name: string; value: number }[]
    dataKey?: string
    layout?: "horizontal" | "vertical"
    height?: number
    barSize?: number
    valueFormatter?: (value: number) => string
    valueLabel?: string
    showXAxis?: boolean
    showYAxis?: boolean
    barRadius?: [number, number, number, number]
}

export function SimpleBarChart({
    data,
    dataKey = "value",
    layout = "vertical",
    height = 280,
    barSize = 20,
    valueFormatter = (v) => v.toLocaleString(),
    valueLabel = "Count",
    showXAxis = true,
    showYAxis = true,
    barRadius,
}: SimpleBarChartProps) {
    if (data.length === 0) {
        return <div className={emptyStateClass}>No data available</div>
    }

    const isVertical = layout === "vertical"
    const defaultRadius: [number, number, number, number] = isVertical ? [0, 2, 2, 0] : [2, 2, 0, 0]

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={data}
                layout={layout}
                margin={{ top: 10, right: 30, left: isVertical ? 30 : 0, bottom: isVertical ? 0 : 20 }}
            >
                <CartesianGrid
                    strokeDasharray={gridStyle.strokeDasharray}
                    stroke={gridStyle.stroke}
                    horizontal={!isVertical}
                    vertical={isVertical}
                />
                <XAxis
                    type={isVertical ? "number" : "category"}
                    dataKey={isVertical ? undefined : "name"}
                    tick={{ ...tickStyle }}
                    tickLine={false}
                    axisLine={{ stroke: axisStyle.stroke }}
                    hide={!showXAxis}
                />
                <YAxis
                    type={isVertical ? "category" : "number"}
                    dataKey={isVertical ? "name" : undefined}
                    tick={{ ...tickStyle }}
                    tickLine={false}
                    axisLine={{ stroke: axisStyle.stroke }}
                    width={isVertical ? 100 : undefined}
                    hide={!showYAxis}
                />
                <Tooltip
                    cursor={{ fill: "hsl(0, 0%, 96%)" }}
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined) => [valueFormatter(value ?? 0), valueLabel]}
                />
                <Bar
                    dataKey={dataKey}
                    fill={ACCENT_COLOR}
                    radius={barRadius ?? defaultRadius}
                    barSize={barSize}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

export default SimpleBarChart
