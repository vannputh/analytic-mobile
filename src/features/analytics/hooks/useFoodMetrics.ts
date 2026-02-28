import { useMemo } from "react"
import type { FoodEntry } from "@/src/shared/types/database"

export interface FoodMetrics {
  totalVisits: number
  uniquePlaces: number
  wouldReturnCount: number
  totalSpent: number
  averagePrice: number
  spentByMonth: { month: string; amount: number }[]
  spentByCuisine: Record<string, number>
  spentByItemCategory: Record<string, number>
  averageRating: number
  averageFoodRating: number
  averageAmbianceRating: number
  averageServiceRating: number
  averageValueRating: number
  ratingDistribution: { rating: number; count: number }[]
  countByMonth: { month: string; count: number }[]
  countByCuisine: Record<string, number>
  countByCity: Record<string, number>
  countByNeighborhood: Record<string, number>
  countByCategory: Record<string, number>
  countByPriceLevel: Record<string, number>
  countByTag: Record<string, number>
  countByItemCategory: Record<string, number>
  countByDiningType: Record<string, number>
  topCuisine: string | null
  topCity: string | null
  topNeighborhood: string | null
  topCategory: string | null
  topItemCategory: string | null
  topDiningType: string | null
  mostVisitedPlaces: { name: string; count: number; avgRating: number }[]
  recentEntries: FoodEntry[]
}

function getMonthKey(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getTopEntry(record: Record<string, number>): string | null {
  const entries = Object.entries(record)
  if (entries.length === 0) return null
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]
}

function incrementRecord(record: Record<string, number>, key: string | null | undefined, amount = 1) {
  if (!key) return
  record[key] = (record[key] || 0) + amount
}

export function useFoodMetrics(data: FoodEntry[]): FoodMetrics {
  return useMemo(() => {
    let totalSpent = 0
    let totalRatingSum = 0
    let ratedItemCount = 0
    let totalFoodRatingSum = 0
    let foodRatingCount = 0
    let totalAmbianceRatingSum = 0
    let ambianceRatingCount = 0
    let totalServiceRatingSum = 0
    let serviceRatingCount = 0
    let totalValueRatingSum = 0
    let valueRatingCount = 0
    let wouldReturnCount = 0

    const spentByMonthMap: Record<string, number> = {}
    const spentByCuisine: Record<string, number> = {}
    const spentByItemCategory: Record<string, number> = {}
    const countByMonthMap: Record<string, number> = {}
    const countByCuisine: Record<string, number> = {}
    const countByCity: Record<string, number> = {}
    const countByNeighborhood: Record<string, number> = {}
    const countByCategory: Record<string, number> = {}
    const countByPriceLevel: Record<string, number> = {}
    const countByTag: Record<string, number> = {}
    const countByItemCategory: Record<string, number> = {}
    const countByDiningType: Record<string, number> = {}
    const ratingBuckets: Record<number, number> = {}

    const placeVisits: Record<string, { count: number; totalRating: number; ratingCount: number }> = {}
    const uniquePlaces = new Set<string>()

    for (const entry of data) {
      const month = getMonthKey(entry.visit_date)
      uniquePlaces.add(entry.name)

      if (!placeVisits[entry.name]) {
        placeVisits[entry.name] = { count: 0, totalRating: 0, ratingCount: 0 }
      }
      placeVisits[entry.name].count += 1
      if (entry.overall_rating) {
        placeVisits[entry.name].totalRating += entry.overall_rating
        placeVisits[entry.name].ratingCount += 1
      }

      if (entry.would_return) wouldReturnCount += 1

      const price = entry.total_price
      if (typeof price === "number" && price > 0) {
        totalSpent += price
        if (month) spentByMonthMap[month] = (spentByMonthMap[month] || 0) + price

        if (entry.cuisine_type && Array.isArray(entry.cuisine_type) && entry.cuisine_type.length > 0) {
          const perCuisine = price / entry.cuisine_type.length
          for (const cuisine of entry.cuisine_type) incrementRecord(spentByCuisine, cuisine.trim(), perCuisine)
        }

        if (entry.items_ordered && Array.isArray(entry.items_ordered)) {
          for (const item of entry.items_ordered) {
            const categories = item.categories?.length ? item.categories : item.category ? [item.category] : []
            if (categories.length > 0 && item.price) {
              const perCategory = item.price / categories.length
              for (const category of categories) incrementRecord(spentByItemCategory, category, perCategory)
            }
          }
        }
      }

      incrementRecord(countByCity, entry.city)
      incrementRecord(countByNeighborhood, entry.neighborhood)
      incrementRecord(countByCategory, entry.category)
      incrementRecord(countByPriceLevel, entry.price_level)
      incrementRecord(countByDiningType, entry.dining_type)
      if (month) incrementRecord(countByMonthMap, month)

      if (entry.cuisine_type && Array.isArray(entry.cuisine_type)) {
        for (const cuisine of entry.cuisine_type) incrementRecord(countByCuisine, cuisine.trim())
      }

      if (entry.tags && Array.isArray(entry.tags)) {
        for (const tag of entry.tags) incrementRecord(countByTag, tag.trim())
      }

      if (entry.items_ordered && Array.isArray(entry.items_ordered)) {
        for (const item of entry.items_ordered) {
          const categories = item.categories?.length ? item.categories : item.category ? [item.category] : []
          for (const category of categories) incrementRecord(countByItemCategory, category)
        }
      }

      if (entry.overall_rating != null) {
        totalRatingSum += entry.overall_rating
        ratedItemCount += 1
        const bucket = Math.floor(entry.overall_rating)
        ratingBuckets[bucket] = (ratingBuckets[bucket] || 0) + 1
      }

      if (entry.food_rating) {
        totalFoodRatingSum += entry.food_rating
        foodRatingCount += 1
      }
      if (entry.ambiance_rating) {
        totalAmbianceRatingSum += entry.ambiance_rating
        ambianceRatingCount += 1
      }
      if (entry.service_rating) {
        totalServiceRatingSum += entry.service_rating
        serviceRatingCount += 1
      }
      if (entry.value_rating) {
        totalValueRatingSum += entry.value_rating
        valueRatingCount += 1
      }
    }

    const spentByMonth = Object.entries(spentByMonthMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((left, right) => left.month.localeCompare(right.month))

    const countByMonth = Object.entries(countByMonthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((left, right) => left.month.localeCompare(right.month))

    const ratingDistribution = Object.entries(ratingBuckets)
      .map(([rating, count]) => ({ rating: Number.parseInt(rating, 10), count }))
      .sort((left, right) => left.rating - right.rating)

    const averagePrice = data.length > 0 ? totalSpent / data.length : 0
    const averageRating = ratedItemCount > 0 ? totalRatingSum / ratedItemCount : 0
    const averageFoodRating = foodRatingCount > 0 ? totalFoodRatingSum / foodRatingCount : 0
    const averageAmbianceRating = ambianceRatingCount > 0 ? totalAmbianceRatingSum / ambianceRatingCount : 0
    const averageServiceRating = serviceRatingCount > 0 ? totalServiceRatingSum / serviceRatingCount : 0
    const averageValueRating = valueRatingCount > 0 ? totalValueRatingSum / valueRatingCount : 0

    const mostVisitedPlaces = Object.entries(placeVisits)
      .map(([name, visit]) => ({
        name,
        count: visit.count,
        avgRating: visit.ratingCount > 0 ? visit.totalRating / visit.ratingCount : 0
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10)

    const recentEntries = [...data]
      .sort((left, right) => new Date(right.visit_date).getTime() - new Date(left.visit_date).getTime())
      .slice(0, 5)

    return {
      totalVisits: data.length,
      uniquePlaces: uniquePlaces.size,
      wouldReturnCount,
      totalSpent,
      averagePrice,
      spentByMonth,
      spentByCuisine,
      spentByItemCategory,
      averageRating,
      averageFoodRating,
      averageAmbianceRating,
      averageServiceRating,
      averageValueRating,
      ratingDistribution,
      countByMonth,
      countByCuisine,
      countByCity,
      countByNeighborhood,
      countByCategory,
      countByPriceLevel,
      countByTag,
      countByItemCategory,
      countByDiningType,
      topCuisine: getTopEntry(countByCuisine),
      topCity: getTopEntry(countByCity),
      topNeighborhood: getTopEntry(countByNeighborhood),
      topCategory: getTopEntry(countByCategory),
      topItemCategory: getTopEntry(countByItemCategory),
      topDiningType: getTopEntry(countByDiningType),
      mostVisitedPlaces,
      recentEntries
    }
  }, [data])
}
