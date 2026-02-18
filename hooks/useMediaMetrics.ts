"use client"

import { useMemo } from "react"
import { MediaEntry, VISUAL_MEDIA_TYPES } from "@/lib/database.types"
import { parseDurationToMinutes, parsePrice } from "@/lib/parsing-utils"
import { normalizeLanguage } from "@/lib/language-utils"

export interface MediaMetrics {
  // Financials
  totalSpent: number
  averagePrice: number
  spentByMedium: Record<string, number>
  spentByMonth: { month: string; amount: number; byMedium: Record<string, number> }[]

  // Time Volume (Visual Media)
  totalMinutes: number
  totalHours: number
  daysWatched: number
  minutesByMonth: { month: string; minutes: number }[]
  minutesByMedium: Record<string, number>

  // Counts & Diversity
  totalItems: number
  countByMedium: Record<string, number>
  countByLanguage: Record<string, number>
  countByGenre: Record<string, number>
  countByPlatform: Record<string, number>
  countByStatus: Record<string, number>
  countByType: Record<string, number>
  countByMonth: { month: string; count: number }[]

  // Ratings
  averageRating: number
  ratingDistribution: { rating: number; count: number }[]

  // Top entries
  topLanguage: string | null
  topGenre: string | null
  topPlatform: string | null
  topMedium: string | null
}

function getMonthKey(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getTopEntry(record: Record<string, number>): string | null {
  const entries = Object.entries(record)
  if (entries.length === 0) return null
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
}

function incrementRecord(record: Record<string, number>, key: string | null, amount = 1) {
  if (!key) return
  record[key] = (record[key] || 0) + amount
}

export function useMediaMetrics(data: MediaEntry[]): MediaMetrics {
  return useMemo(() => {
    // Initialize aggregators
    let totalSpent = 0
    let totalMinutes = 0
    let totalRatingSum = 0
    let ratedItemCount = 0

    const spentByMedium: Record<string, number> = {}
    const spentByMonthMap: Record<string, { amount: number; byMedium: Record<string, number> }> = {}
    const minutesByMonthMap: Record<string, number> = {}
    const minutesByMedium: Record<string, number> = {}
    const countByMedium: Record<string, number> = {}
    const countByLanguage: Record<string, number> = {}
    const countByGenre: Record<string, number> = {}
    const countByPlatform: Record<string, number> = {}
    const countByStatus: Record<string, number> = {}
    const countByType: Record<string, number> = {}
    const countByMonthMap: Record<string, number> = {}
    const ratingBuckets: Record<number, number> = {}

    for (const entry of data) {
      const month = getMonthKey(entry.finish_date) || getMonthKey(entry.start_date)
      const medium = entry.medium
      const isVisualMedia = medium && (VISUAL_MEDIA_TYPES as readonly string[]).includes(medium)

      // Financial calculations
      const price = parsePrice(entry.price)
      if (price !== null && price > 0) {
        totalSpent += price
        incrementRecord(spentByMedium, medium, price)

        if (month) {
          if (!spentByMonthMap[month]) {
            spentByMonthMap[month] = { amount: 0, byMedium: {} }
          }
          spentByMonthMap[month].amount += price
          incrementRecord(spentByMonthMap[month].byMedium, medium, price)
        }
      }

      // Time volume (visual media only)
      if (isVisualMedia) {
        const minutes = parseDurationToMinutes(entry.length)
        if (minutes !== null && minutes > 0) {
          totalMinutes += minutes
          incrementRecord(minutesByMedium, medium, minutes)
          if (month) {
            incrementRecord(minutesByMonthMap, month, minutes)
          }
        }
      }

      // Counts
      incrementRecord(countByMedium, medium)
      incrementRecord(countByPlatform, entry.platform)
      incrementRecord(countByStatus, entry.status)
      incrementRecord(countByType, entry.type)
      if (month) {
        incrementRecord(countByMonthMap, month)
      }

      // Genre (flatten arrays)
      if (entry.genre && Array.isArray(entry.genre)) {
        for (const g of entry.genre) {
          incrementRecord(countByGenre, g.trim())
        }
      }

      // Language (normalize to handle strings and arrays)
      if (entry.language) {
        const languages = normalizeLanguage(entry.language)
        for (const l of languages) {
          incrementRecord(countByLanguage, l)
        }
      }

      // Ratings
      const rating = entry.my_rating ?? entry.rating
      if (rating !== null && rating !== undefined) {
        totalRatingSum += rating
        ratedItemCount++
        const bucket = Math.floor(rating)
        ratingBuckets[bucket] = (ratingBuckets[bucket] || 0) + 1
      }
    }

    // Convert maps to sorted arrays
    const spentByMonth = Object.entries(spentByMonthMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const minutesByMonth = Object.entries(minutesByMonthMap)
      .map(([month, minutes]) => ({ month, minutes }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const countByMonth = Object.entries(countByMonthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const ratingDistribution = Object.entries(ratingBuckets)
      .map(([rating, count]) => ({ rating: parseInt(rating, 10), count }))
      .sort((a, b) => a.rating - b.rating)

    // Calculate derived metrics
    const totalHours = totalMinutes / 60
    const daysWatched = totalHours / 24
    const averagePrice = data.length > 0 ? totalSpent / data.length : 0
    const averageRating = ratedItemCount > 0 ? totalRatingSum / ratedItemCount : 0

    return {
      // Financials
      totalSpent,
      averagePrice,
      spentByMedium,
      spentByMonth,

      // Time Volume
      totalMinutes,
      totalHours,
      daysWatched,
      minutesByMonth,
      minutesByMedium,

      // Counts & Diversity
      totalItems: data.length,
      countByMedium,
      countByLanguage,
      countByGenre,
      countByPlatform,
      countByStatus,
      countByType,
      countByMonth,

      // Ratings
      averageRating,
      ratingDistribution,

      // Top entries
      topLanguage: getTopEntry(countByLanguage),
      topGenre: getTopEntry(countByGenre),
      topPlatform: getTopEntry(countByPlatform),
      topMedium: getTopEntry(countByMedium),
    }
  }, [data])
}

export default useMediaMetrics

