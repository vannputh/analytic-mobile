import { getFoodEntries, getUniqueCuisineTypes, getUniqueItemCategories, getUniqueCities, getUniqueCategories } from "@/lib/food-actions"
import { PageHeader } from "@/components/page-header"
import { AnalyticsClient } from "./analytics-client"
import { AlertCircle } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function FoodAnalyticsPage() {
    try {
        // Fetch all filter options and initial data in parallel
        const [
            entriesResult,
            cuisinesResult,
            itemCategoriesResult,
            citiesResult,
            categoriesResult
        ] = await Promise.all([
            getFoodEntries(),
            getUniqueCuisineTypes(),
            getUniqueItemCategories(),
            getUniqueCities(),
            getUniqueCategories(),
        ])

        if (!entriesResult.success) {
            throw new Error(entriesResult.error || "Failed to load entries")
        }

        return (
            <div className="min-h-screen bg-background">
                <PageHeader title="Food Analytics" />
                <AnalyticsClient
                    initialEntries={entriesResult.data || []}
                    cuisineTypes={cuisinesResult.success ? cuisinesResult.data : []}
                    itemCategories={itemCategoriesResult.success ? itemCategoriesResult.data : []}
                    categories={categoriesResult.success ? categoriesResult.data : []}
                    cities={citiesResult.success ? citiesResult.data : []}
                />
            </div>
        )
    } catch (err) {
        console.error("Failed to fetch analytics data:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to load entries"

        return (
            <div className="min-h-screen bg-background text-foreground">
                <PageHeader title="Food Analytics" />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-destructive">
                        <AlertCircle className="h-8 w-8" />
                        <p className="text-sm font-mono">{errorMessage}</p>
                    </div>
                </div>
            </div>
        )
    }
}

