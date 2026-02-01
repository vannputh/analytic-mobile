"use client"

import { useMemo } from "react"
import { FoodEntry } from "@/lib/database.types"

export interface FoodMetrics {
    // Summary
    totalVisits: number
    uniquePlaces: number
    wouldReturnCount: number

    // Financials
    totalSpent: number
    averagePrice: number
    spentByMonth: { month: string; amount: number }[]
    spentByCuisine: Record<string, number>
    spentByItemCategory: Record<string, number>

    // Ratings
    averageRating: number
    averageFoodRating: number
    averageAmbianceRating: number
    averageServiceRating: number
    averageValueRating: number
    ratingDistribution: { rating: number; count: number }[]

    // Breakdown counts
    countByMonth: { month: string; count: number }[]
    countByCuisine: Record<string, number>
    countByCity: Record<string, number>
    countByNeighborhood: Record<string, number>
    countByCategory: Record<string, number>
    countByPriceLevel: Record<string, number>
    countByTag: Record<string, number>
    countByItemCategory: Record<string, number>
    countByDiningType: Record<string, number>

    // Top entries
    topCuisine: string | null
    topCity: string | null
    topNeighborhood: string | null
    topCategory: string | null
    topItemCategory: string | null
    topDiningType: string | null

    // Most visited
    mostVisitedPlaces: { name: string; count: number; avgRating: number }[]

    // Recent entries
    recentEntries: FoodEntry[]
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

function incrementRecord(record: Record<string, number>, key: string | null | undefined, amount = 1) {
    if (!key) return
    record[key] = (record[key] || 0) + amount
}

export function useFoodMetrics(data: FoodEntry[]): FoodMetrics {
    return useMemo(() => {
        // Initialize aggregators
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

        // Track visits by place name
        const placeVisits: Record<string, { count: number; totalRating: number; ratingCount: number }> = {}
        const uniquePlaces = new Set<string>()

        for (const entry of data) {
            const month = getMonthKey(entry.visit_date)

            // Track unique places
            uniquePlaces.add(entry.name)

            // Track place visits
            if (!placeVisits[entry.name]) {
                placeVisits[entry.name] = { count: 0, totalRating: 0, ratingCount: 0 }
            }
            placeVisits[entry.name].count++
            if (entry.overall_rating) {
                placeVisits[entry.name].totalRating += entry.overall_rating
                placeVisits[entry.name].ratingCount++
            }

            // Would return
            if (entry.would_return) {
                wouldReturnCount++
            }

            // Financial calculations
            const price = entry.total_price
            if (price !== null && price !== undefined && price > 0) {
                totalSpent += price

                if (month) {
                    spentByMonthMap[month] = (spentByMonthMap[month] || 0) + price
                }

                // Spending by cuisine
                if (entry.cuisine_type && Array.isArray(entry.cuisine_type)) {
                    const perCuisinePrice = price / entry.cuisine_type.length
                    for (const c of entry.cuisine_type) {
                        incrementRecord(spentByCuisine, c.trim(), perCuisinePrice)
                    }
                }

                // Spending by item category
                if (entry.items_ordered && Array.isArray(entry.items_ordered)) {
                    for (const item of entry.items_ordered) {
                        const categories = item.categories?.length ? item.categories : (item.category ? [item.category] : [])
                        if (categories.length > 0 && item.price) {
                            const perCategoryPrice = item.price / categories.length
                            for (const cat of categories) {
                                incrementRecord(spentByItemCategory, cat, perCategoryPrice)
                            }
                        }
                    }
                }
            }

            // Counts
            incrementRecord(countByCity, entry.city)
            incrementRecord(countByNeighborhood, entry.neighborhood)
            incrementRecord(countByCategory, entry.category)
            incrementRecord(countByPriceLevel, entry.price_level)
            incrementRecord(countByDiningType, entry.dining_type)

            if (month) {
                incrementRecord(countByMonthMap, month)
            }

            // Cuisine (flatten arrays)
            if (entry.cuisine_type && Array.isArray(entry.cuisine_type)) {
                for (const c of entry.cuisine_type) {
                    incrementRecord(countByCuisine, c.trim())
                }
            }

            // Tags (flatten arrays)
            if (entry.tags && Array.isArray(entry.tags)) {
                for (const t of entry.tags) {
                    incrementRecord(countByTag, t.trim())
                }
            }

            // Item categories (from items_ordered)
            if (entry.items_ordered && Array.isArray(entry.items_ordered)) {
                for (const item of entry.items_ordered) {
                    const categories = item.categories?.length ? item.categories : (item.category ? [item.category] : [])
                    for (const cat of categories) {
                        incrementRecord(countByItemCategory, cat)
                    }
                }
            }

            // Overall Rating
            if (entry.overall_rating !== null && entry.overall_rating !== undefined) {
                totalRatingSum += entry.overall_rating
                ratedItemCount++
                const bucket = Math.floor(entry.overall_rating)
                ratingBuckets[bucket] = (ratingBuckets[bucket] || 0) + 1
            }

            // Sub-ratings
            if (entry.food_rating) {
                totalFoodRatingSum += entry.food_rating
                foodRatingCount++
            }
            if (entry.ambiance_rating) {
                totalAmbianceRatingSum += entry.ambiance_rating
                ambianceRatingCount++
            }
            if (entry.service_rating) {
                totalServiceRatingSum += entry.service_rating
                serviceRatingCount++
            }
            if (entry.value_rating) {
                totalValueRatingSum += entry.value_rating
                valueRatingCount++
            }
        }

        // Convert maps to sorted arrays
        const spentByMonth = Object.entries(spentByMonthMap)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month))

        const countByMonth = Object.entries(countByMonthMap)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month))

        const ratingDistribution = Object.entries(ratingBuckets)
            .map(([rating, count]) => ({ rating: parseInt(rating, 10), count }))
            .sort((a, b) => a.rating - b.rating)

        // Calculate derived metrics
        const averagePrice = data.length > 0 ? totalSpent / data.length : 0
        const averageRating = ratedItemCount > 0 ? totalRatingSum / ratedItemCount : 0
        const averageFoodRating = foodRatingCount > 0 ? totalFoodRatingSum / foodRatingCount : 0
        const averageAmbianceRating = ambianceRatingCount > 0 ? totalAmbianceRatingSum / ambianceRatingCount : 0
        const averageServiceRating = serviceRatingCount > 0 ? totalServiceRatingSum / serviceRatingCount : 0
        const averageValueRating = valueRatingCount > 0 ? totalValueRatingSum / valueRatingCount : 0

        // Most visited places
        const mostVisitedPlaces = Object.entries(placeVisits)
            .map(([name, data]) => ({
                name,
                count: data.count,
                avgRating: data.ratingCount > 0 ? data.totalRating / data.ratingCount : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // Recent entries (last 5)
        const recentEntries = [...data]
            .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
            .slice(0, 5)

        return {
            // Summary
            totalVisits: data.length,
            uniquePlaces: uniquePlaces.size,
            wouldReturnCount,

            // Financials
            totalSpent,
            averagePrice,
            spentByMonth,
            spentByCuisine,
            spentByItemCategory,

            // Ratings
            averageRating,
            averageFoodRating,
            averageAmbianceRating,
            averageServiceRating,
            averageValueRating,
            ratingDistribution,

            // Breakdown counts
            countByMonth,
            countByCuisine,
            countByCity,
            countByNeighborhood,
            countByCategory,
            countByPriceLevel,
            countByTag,
            countByItemCategory,
            countByDiningType,

            // Top entries
            topCuisine: getTopEntry(countByCuisine),
            topCity: getTopEntry(countByCity),
            topNeighborhood: getTopEntry(countByNeighborhood),
            topCategory: getTopEntry(countByCategory),
            topItemCategory: getTopEntry(countByItemCategory),
            topDiningType: getTopEntry(countByDiningType),

            // Most visited
            mostVisitedPlaces,

            // Recent
            recentEntries,
        }
    }, [data])
}

export default useFoodMetrics
