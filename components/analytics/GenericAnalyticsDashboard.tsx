"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleBarChart, SimplePieChart } from "@/components/charts"

export interface KPIConfig {
    label: string
    value: string | number
    subValue?: string
}

export interface ChartConfig {
    title: string
    type: 'bar' | 'pie'
    data: any[]
    dataKey?: string // for bar charts mainly
    valueLabel?: string
    layout?: 'vertical' | 'horizontal'
    height?: number
}

interface GenericAnalyticsDashboardProps {
    kpis: KPIConfig[]
    charts: ChartConfig[]
}

export function GenericAnalyticsDashboard({ kpis, charts }: GenericAnalyticsDashboardProps) {
    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className={`grid grid-cols-2 md:grid-cols-${Math.min(kpis.length, 4)} gap-4`}>
                {kpis.map((kpi, idx) => (
                    <Card key={idx}>
                        <CardContent className="p-6">
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                            <div className="mt-2">
                                <p className="text-3xl font-bold font-mono">{kpi.value}</p>
                                {kpi.subValue && <p className="text-xs text-muted-foreground">{kpi.subValue}</p>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {charts.map((chart, idx) => (
                    <Card key={idx} className={chart.type === 'bar' && chart.layout === 'vertical' ? 'col-span-1 lg:col-span-2' : ''}>
                        <CardHeader>
                            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                                {chart.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {chart.type === 'bar' && (
                                <SimpleBarChart
                                    data={chart.data}
                                    layout={chart.layout || 'horizontal'}
                                    valueLabel={chart.valueLabel || 'Count'}
                                    height={chart.height}
                                // Assuming SimpleBarChart can handle dataKey or defaults to 'value'
                                />
                            )}
                            {chart.type === 'pie' && (
                                <SimplePieChart
                                    data={chart.data}
                                    title={chart.title} // Or chart.valueLabel if SimplePieChart expects it 
                                    valueLabel={chart.valueLabel || 'Items'}
                                    height={chart.height}
                                />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
