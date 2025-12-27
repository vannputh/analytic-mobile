'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Film, Calendar } from 'lucide-react'

interface StatsCardsProps {
  finishedThisYear: number
  totalSpent: number
  topMedium: string
  topMediumCount: number
  totalEntries: number
}

export function StatsCards({
  finishedThisYear,
  totalSpent,
  topMedium,
  topMediumCount,
  totalEntries,
}: StatsCardsProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Finished This Year */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Finished ({currentYear})
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif">{finishedThisYear}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Completed this year
          </p>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Spent
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif">
            ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lifetime expenditure
          </p>
        </CardContent>
      </Card>

      {/* Top Medium */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Medium
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif truncate">{topMedium}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {topMediumCount} {topMediumCount === 1 ? 'entry' : 'entries'}
          </p>
        </CardContent>
      </Card>

      {/* Total Entries */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Entries
          </CardTitle>
          <Film className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-serif">{totalEntries}</div>
          <p className="text-xs text-muted-foreground mt-1">
            All time
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


