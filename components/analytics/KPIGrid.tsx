"use client"

import {
  DollarSign,
  Clock,
  Calendar,
  Globe,
  Film,
  Star,
  TrendingUp,
  Layers,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MediaMetrics } from "@/hooks/useMediaMetrics"
import { formatCurrency, formatNumber, formatDuration } from "@/lib/parsing-utils"

interface KPIGridProps {
  metrics: MediaMetrics
}

interface KPICardProps {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
  className?: string
}

function KPICard({ label, value, subValue, icon, trend, className }: KPICardProps) {
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
        {trend && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-0.5",
              trend === "up" && "bg-green-500/50",
              trend === "down" && "bg-red-500/50",
              trend === "neutral" && "bg-muted"
            )}
          />
        )}
      </CardContent>
    </Card>
  )
}

export function KPIGrid({ metrics }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Row 1: High Level Stats */}
      <KPICard
        label="Total Spent"
        value={formatCurrency(metrics.totalSpent)}
        subValue={`avg ${formatCurrency(metrics.averagePrice)}/item`}
        icon={<DollarSign className="h-8 w-8" />}
      />
      <KPICard
        label="Hours Watched"
        value={formatNumber(metrics.totalHours, 1)}
        subValue={formatDuration(metrics.totalMinutes)}
        icon={<Clock className="h-8 w-8" />}
      />
      <KPICard
        label="Days of Life"
        value={formatNumber(metrics.daysWatched, 2)}
        subValue="spent consuming media"
        icon={<Calendar className="h-8 w-8" />}
      />
      <KPICard
        label="Items Finished"
        value={formatNumber(metrics.totalItems)}
        subValue={
          metrics.topMedium ? `mostly ${metrics.topMedium}` : undefined
        }
        icon={<Layers className="h-8 w-8" />}
      />
      <KPICard
        label="Avg Rating"
        value={metrics.averageRating > 0 ? formatNumber(metrics.averageRating, 1) : "—"}
        subValue={metrics.averageRating > 0 ? "out of 10" : "no ratings"}
        icon={<Star className="h-8 w-8" />}
      />

      {/* Row 2: Diversity & Metadata */}
      <KPICard
        label="Top Genre"
        value={metrics.topGenre || "—"}
        subValue={
          metrics.topGenre && metrics.countByGenre[metrics.topGenre]
            ? `${metrics.countByGenre[metrics.topGenre]} items`
            : undefined
        }
        icon={<Film className="h-8 w-8" />}
      />
      <KPICard
        label="Top Language"
        value={metrics.topLanguage || "—"}
        subValue={
          metrics.topLanguage && metrics.countByLanguage[metrics.topLanguage]
            ? `${metrics.countByLanguage[metrics.topLanguage]} items`
            : undefined
        }
        icon={<Globe className="h-8 w-8" />}
      />
      <KPICard
        label="Genres"
        value={formatNumber(Object.keys(metrics.countByGenre).length)}
        subValue="unique genres"
        icon={<TrendingUp className="h-8 w-8" />}
      />
      <KPICard
        label="Languages"
        value={formatNumber(Object.keys(metrics.countByLanguage).length)}
        subValue="different languages"
        icon={<Globe className="h-8 w-8" />}
      />
      <KPICard
        label="Platforms"
        value={formatNumber(Object.keys(metrics.countByPlatform).length)}
        subValue={metrics.topPlatform ? `top: ${metrics.topPlatform}` : "no platform data"}
        icon={<Layers className="h-8 w-8" />}
      />
    </div>
  )
}

export default KPIGrid









