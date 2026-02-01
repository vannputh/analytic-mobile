"use client"

import {
    DollarSign,
    Utensils,
    MapPin,
    Star,
    Heart,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FoodMetrics } from "@/hooks/useFoodMetrics"

interface FoodKPIGridProps {
    metrics: FoodMetrics
}

interface KPICardProps {
    label: string
    value: string
    subValue?: string
    icon: React.ReactNode
    className?: string
}

function KPICard({ label, value, subValue, icon, className }: KPICardProps) {
    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                            {label}
                        </p>
                        <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
                        {subValue && (
                            <p className="text-xs text-muted-foreground font-mono">{subValue}</p>
                        )}
                    </div>
                    <div className="text-muted-foreground/30">{icon}</div>
                </div>
            </CardContent>
        </Card>
    )
}

function formatCurrency(amount: number): string {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`
    }
    return `$${amount.toLocaleString()}`
}

function formatNumber(num: number, decimals = 0): string {
    return num.toFixed(decimals)
}

export function FoodKPIGrid({ metrics }: FoodKPIGridProps) {
    const wouldReturnRate = metrics.totalVisits > 0
        ? Math.round((metrics.wouldReturnCount / metrics.totalVisits) * 100)
        : 0

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
                label="Total Visits"
                value={formatNumber(metrics.totalVisits)}
                subValue={`${metrics.uniquePlaces} unique places`}
                icon={<Utensils className="h-8 w-8" />}
            />
            <KPICard
                label="Total Spent"
                value={formatCurrency(metrics.totalSpent)}
                subValue={`avg ${formatCurrency(metrics.averagePrice)}/visit`}
                icon={<DollarSign className="h-8 w-8" />}
            />
            <KPICard
                label="Avg Rating"
                value={metrics.averageRating > 0 ? formatNumber(metrics.averageRating, 1) : "—"}
                subValue={metrics.averageRating > 0 ? "out of 5" : "no ratings"}
                icon={<Star className="h-8 w-8" />}
            />
            <KPICard
                label="Top City"
                value={metrics.topCity || "—"}
                subValue={
                    metrics.topCity && metrics.countByCity[metrics.topCity]
                        ? `${metrics.countByCity[metrics.topCity]} visits`
                        : undefined
                }
                icon={<MapPin className="h-8 w-8" />}
            />
            <KPICard
                label="Top Food Type"
                value={metrics.topItemCategory || "—"}
                subValue={
                    metrics.topItemCategory && metrics.countByItemCategory[metrics.topItemCategory]
                        ? `${metrics.countByItemCategory[metrics.topItemCategory]} visits`
                        : undefined
                }
                icon={<Utensils className="h-8 w-8" />}
            />
            <KPICard
                label="Would Return"
                value={`${wouldReturnRate}%`}
                subValue={`${metrics.wouldReturnCount} of ${metrics.totalVisits} places`}
                icon={<Heart className="h-8 w-8" />}
            />
        </div>
    )
}

export default FoodKPIGrid
