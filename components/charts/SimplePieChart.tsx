"use client"

import { useMemo } from "react"
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"
import { CHART_COLORS, tooltipStyle, emptyStateClass, formatNumber } from "./chart-config"

interface SimplePieChartProps {
    data: Record<string, number> | { name: string; value: number }[]
    title?: string
    height?: number
    innerRadius?: number
    outerRadius?: number
    showLegend?: boolean
    limitItems?: number
    valueFormatter?: (value: number) => string
    valueLabel?: string
    showPercentLabel?: boolean
}

export function SimplePieChart({
    data,
    title = "data",
    height = 320,
    innerRadius = 60,
    outerRadius = 90,
    showLegend = true,
    limitItems = 8,
    valueFormatter = formatNumber,
    valueLabel = "Count",
    showPercentLabel = true,
}: SimplePieChartProps) {
    const chartData = useMemo(() => {
        let processedData: { name: string; value: number }[] = []

        if (Array.isArray(data)) {
            processedData = data
        } else {
            processedData = Object.entries(data)
                .filter(([name]) => name && name !== "null" && name !== "undefined")
                .map(([name, value]) => ({ name, value }))
        }

        return processedData
            .sort((a, b) => b.value - a.value)
            .slice(0, limitItems)
    }, [data, limitItems])

    if (chartData.length === 0) {
        return (
            <div className={emptyStateClass}>
                No {title.toLowerCase()} data
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart margin={{ top: 20, right: 20, bottom: showLegend ? 40 : 20, left: 20 }}>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy={showLegend ? "45%" : "50%"}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={3}
                    dataKey="value"
                    label={showPercentLabel ? ({ percent }) => {
                        const p = percent ?? 0
                        if (p < 0.05) return ""
                        return `${(p * 100).toFixed(0)}%`
                    } : undefined}
                    labelLine={showPercentLabel ? { stroke: "hsl(0, 0%, 60%)", strokeWidth: 1 } : false}
                >
                    {chartData.map((_, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="hsl(0, 0%, 100%)"
                            strokeWidth={1}
                        />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined) => [valueFormatter(value ?? 0), valueLabel]}
                />
                {showLegend && (
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }}
                    />
                )}
            </PieChart>
        </ResponsiveContainer>
    )
}

export default SimplePieChart
