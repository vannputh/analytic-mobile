'use server'

import { createClient } from '@/lib/supabase/server'
import { FoodEntry, FoodEntryInsert, FoodEntryUpdate, FoodEntryImage, FoodEntryImageInsert } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'

/** Revalidate food-related paths */
function revalidateFoodPaths() {
    revalidatePath('/food')
    revalidatePath('/food/analytics')
}

export type ActionResponse<T> =
    | { success: true; data: T }
    | { success: false; error: string }

export interface FoodFilters {
    dateFrom?: string | null
    dateTo?: string | null
    category?: string // Keep for backward compatibility if needed
    categories?: string[]
    cuisineType?: string // Keep for backward compatibility
    cuisineTypes?: string[]
    itemCategories?: string[]
    priceLevels?: string[]
    city?: string
    minRating?: number | null
    wouldReturn?: boolean | null
    search?: string
    limit?: number
    offset?: number
    includeImages?: boolean
}

// Helper to apply filters to a Supabase query
function applyFoodFilters(query: any, filters?: FoodFilters) {
    if (!filters) return query

    let q = query

    if (filters.dateFrom) {
        q = q.gte('visit_date', filters.dateFrom)
    }

    if (filters.dateTo) {
        q = q.lte('visit_date', filters.dateTo)
    }

    if (filters.categories && filters.categories.length > 0) {
        q = q.in('category', filters.categories)
    } else if (filters.category) {
        q = q.eq('category', filters.category)
    }

    if (filters.cuisineTypes && filters.cuisineTypes.length > 0) {
        q = q.overlaps('cuisine_type', filters.cuisineTypes)
    } else if (filters.cuisineType) {
        q = q.contains('cuisine_type', [filters.cuisineType])
    }

    if (filters.priceLevels && filters.priceLevels.length > 0) {
        q = q.in('price_level', filters.priceLevels)
    }

    if (filters.wouldReturn !== undefined && filters.wouldReturn !== null) {
        q = q.eq('would_return', filters.wouldReturn)
    }

    if (filters.city) {
        q = q.eq('city', filters.city)
    }

    if (filters.minRating) {
        q = q.gte('overall_rating', filters.minRating)
    }

    if (filters.search) {
        q = q.ilike('name', `%${filters.search}%`)
    }

    return q
}

// Get all food entries with optional filters
export async function getFoodEntries(filters?: FoodFilters): Promise<ActionResponse<FoodEntry[]> & { count?: number | null }> {
    try {
        const supabase = await createClient()

        let selectQuery = '*'
        if (filters?.includeImages) {
            selectQuery = `
                *,
                food_entry_images (
                    image_url,
                    is_primary
                )
            `
        }

        let query = (supabase
            .from('food_entries' as any) as any)
            .select(selectQuery)
            .order('visit_date', { ascending: false })

        query = applyFoodFilters(query, filters)


        // Add pagination if specified
        if (filters?.limit !== undefined && filters?.offset !== undefined) {
            query = query.range(filters.offset, filters.offset + filters.limit - 1)
        } else if (filters?.limit !== undefined) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching food entries:', error)
            return { success: false, error: error.message }
        }

        const entries = (data || []).map((entry: any) => {
            if (filters?.includeImages) {
                const primaryImage = entry.food_entry_images?.find((img: any) => img.is_primary) || entry.food_entry_images?.[0]
                const { food_entry_images, ...rest } = entry
                return {
                    ...rest,
                    primary_image_url: primaryImage?.image_url
                }
            }
            return entry
        })

        return {
            success: true,
            data: entries as FoodEntry[]
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Get single food entry by ID with its images
export async function getFoodEntry(id: string): Promise<ActionResponse<FoodEntry & { images: FoodEntryImage[] }>> {
    try {
        const supabase = await createClient()

        // Get entry with images in a single query
        const { data: entry, error } = await (supabase
            .from('food_entries' as any) as any)
            .select(`
                *,
                food_entry_images (
                    *
                )
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching food entry:', error)
            return { success: false, error: error.message }
        }

        const { food_entry_images, ...rest } = entry as any
        const sortedImages = (food_entry_images || []).sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1
            if (!a.is_primary && b.is_primary) return 1
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

        return {
            success: true,
            data: {
                ...rest,
                images: sortedImages as FoodEntryImage[]
            }
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Create new food entry
export async function createFoodEntry(data: FoodEntryInsert): Promise<ActionResponse<FoodEntry>> {
    try {
        const supabase = await createClient()

        const { data: newEntry, error } = await (supabase
            .from('food_entries' as any) as any)
            .insert(data)
            .select()
            .single()

        if (error) {
            console.error('Error creating food entry:', error)
            return { success: false, error: error.message }
        }

        revalidateFoodPaths()

        return { success: true, data: newEntry as FoodEntry }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Update food entry
export async function updateFoodEntry(id: string, data: FoodEntryUpdate): Promise<ActionResponse<FoodEntry>> {
    try {
        const supabase = await createClient()

        const { data: updatedEntry, error } = await (supabase
            .from('food_entries' as any) as any)
            .update(data)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating food entry:', error)
            return { success: false, error: error.message }
        }

        revalidateFoodPaths()

        return { success: true, data: updatedEntry as FoodEntry }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Delete food entry (images will cascade delete)
export async function deleteFoodEntry(id: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        // First, get all images to delete from storage
        const { data: images } = await (supabase
            .from('food_entry_images' as any) as any)
            .select('storage_path')
            .eq('food_entry_id', id)

        // Delete images from storage
        if (images && images.length > 0) {
            const paths = images.map((img: any) => img.storage_path)
            await supabase.storage.from('food-images').remove(paths)
        }

        // Delete entry (images table will cascade)
        const { error } = await (supabase
            .from('food_entries' as any) as any)
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting food entry:', error)
            return { success: false, error: error.message }
        }

        revalidateFoodPaths()

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Upload image to Supabase storage and return the public URL
export async function uploadFoodImage(
    file: File,
    entryId: string,
    imageType: 'place' | 'item',
    itemIndex?: number
): Promise<ActionResponse<{ url: string; path: string }>> {
    try {
        const supabase = await createClient()

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg'
        const timestamp = Date.now()
        const path = imageType === 'place'
            ? `${entryId}/place_${timestamp}.${ext}`
            : `${entryId}/items/item_${itemIndex}_${timestamp}.${ext}`

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
            return { success: false, error: uploadError.message }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('food-images')
            .getPublicUrl(path)

        return {
            success: true,
            data: {
                url: urlData.publicUrl,
                path: path
            }
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Add image to food entry
export async function addFoodEntryImage(data: FoodEntryImageInsert): Promise<ActionResponse<FoodEntryImage>> {
    try {
        const supabase = await createClient()

        // If this image is primary, unset any other primary images for this entry
        if (data.is_primary) {
            await (supabase
                .from('food_entry_images' as any) as any)
                .update({ is_primary: false })
                .eq('food_entry_id', data.food_entry_id)
        }

        const { data: newImage, error } = await (supabase
            .from('food_entry_images' as any) as any)
            .insert(data)
            .select()
            .single()

        if (error) {
            console.error('Error adding food entry image:', error)
            return { success: false, error: error.message }
        }

        revalidateFoodPaths()

        return { success: true, data: newImage as FoodEntryImage }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Delete image from food entry
export async function deleteFoodEntryImage(imageId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        // Get image path first
        const { data: image } = await (supabase
            .from('food_entry_images' as any) as any)
            .select('storage_path')
            .eq('id', imageId)
            .single()

        if (image) {
            // Delete from storage
            await supabase.storage.from('food-images').remove([image.storage_path])
        }

        // Delete from database
        const { error } = await (supabase
            .from('food_entry_images' as any) as any)
            .delete()
            .eq('id', imageId)

        if (error) {
            console.error('Error deleting food entry image:', error)
            return { success: false, error: error.message }
        }

        revalidateFoodPaths()

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Set primary image for food entry
export async function setFoodEntryPrimaryImage(imageId: string, entryId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        // Unset all primary images for this entry
        await (supabase
            .from('food_entry_images' as any) as any)
            .update({ is_primary: false })
            .eq('food_entry_id', entryId)

        // Set the new primary image
        const { error } = await (supabase
            .from('food_entry_images' as any) as any)
            .update({ is_primary: true })
            .eq('id', imageId)

        if (error) {
            console.error('Error setting primary image:', error)
            return { success: false, error: error.message }
        }

        revalidateFoodPaths()

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Get food stats for analytics
export async function getFoodStats(filters?: FoodFilters): Promise<ActionResponse<{
    totalVisits: number
    totalSpent: number
    averageRating: number
    uniquePlaces: number
    topCuisine: string | null
    topCity: string | null
}>> {
    try {
        const supabase = await createClient()

        let query = (supabase
            .from('food_entries' as any) as any)
            .select('name, total_price, overall_rating, cuisine_type, city')

        query = applyFoodFilters(query, filters)

        const { data: entries, error } = await query

        if (error) {
            console.error('Error fetching food stats:', error)
            return { success: false, error: error.message }
        }

        const foodEntries = (entries || []) as FoodEntry[]

        const totalVisits = foodEntries.length
        const totalSpent = foodEntries.reduce((sum, e) => sum + (e.total_price || 0), 0)
        const ratingsCount = foodEntries.filter(e => e.overall_rating != null).length
        const averageRating = ratingsCount > 0
            ? foodEntries.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / ratingsCount
            : 0

        // Count unique places by name
        const uniquePlaces = new Set(foodEntries.map(e => e.name)).size

        // Count cuisines
        const cuisineCounts: Record<string, number> = {}
        foodEntries.forEach(e => {
            if (e.cuisine_type) {
                e.cuisine_type.forEach(c => {
                    cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
                })
            }
        })
        const topCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

        // Count cities
        const cityCounts: Record<string, number> = {}
        foodEntries.forEach(e => {
            if (e.city) {
                cityCounts[e.city] = (cityCounts[e.city] || 0) + 1
            }
        })
        const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

        return {
            success: true,
            data: {
                totalVisits,
                totalSpent,
                averageRating,
                uniquePlaces,
                topCuisine,
                topCity
            }
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Get entries grouped by date for calendar view
export async function getFoodEntriesByMonth(year: number, month: number, includeImages = false): Promise<ActionResponse<Record<string, FoodEntry[]>>> {
    try {
        const supabase = await createClient()

        // Create date range for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, '0')}-01`

        let selectQuery = '*'
        if (includeImages) {
            selectQuery = `
                *,
                food_entry_images (
                    image_url,
                    is_primary
                )
            `
        }

        const { data, error } = await (supabase
            .from('food_entries' as any) as any)
            .select(selectQuery)
            .gte('visit_date', startDate)
            .lt('visit_date', endDate)
            .order('visit_date', { ascending: true })

        if (error) {
            console.error('Error fetching food entries by month:', error)
            return { success: false, error: error.message }
        }

        // Group by date
        const grouped: Record<string, FoodEntry[]> = {}
        for (const entry of (data || []) as any[]) {
            const date = entry.visit_date
            if (!grouped[date]) {
                grouped[date] = []
            }

            let processedEntry = entry
            if (includeImages) {
                const primaryImage = entry.food_entry_images?.find((img: any) => img.is_primary) || entry.food_entry_images?.[0]
                const { food_entry_images, ...rest } = entry
                processedEntry = {
                    ...rest,
                    primary_image_url: primaryImage?.image_url
                }
            }

            grouped[date].push(processedEntry as FoodEntry)
        }

        return { success: true, data: grouped }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Get primary image for a food entry
export async function getFoodEntryPrimaryImage(entryId: string): Promise<ActionResponse<FoodEntryImage | null>> {
    try {
        const supabase = await createClient()

        const { data, error } = await (supabase
            .from('food_entry_images' as any) as any)
            .select('*')
            .eq('food_entry_id', entryId)
            .eq('is_primary', true)
            .maybeSingle()

        if (error) {
            console.error('Error fetching primary image:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data as FoodEntryImage | null }
    } catch (error) {
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Generic helper to get unique values from a column
async function getUniqueValues(
    column: string,
    extractor?: (data: any[]) => string[]
): Promise<ActionResponse<string[]>> {
    try {
        const supabase = await createClient()
        const { data, error } = await (supabase
            .from('food_entries' as any) as any)
            .select(column)

        if (error) {
            console.error(`Error fetching unique ${column}:`, error)
            return { success: false, error: error.message }
        }

        const values = extractor
            ? extractor(data || [])
            : (data || []).map((e: any) => e[column]).filter(Boolean)

        return { success: true, data: Array.from(new Set(values)).sort() as string[] }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// Get unique cuisine types (array field, excludes "Cafe")
export async function getUniqueCuisineTypes(): Promise<ActionResponse<string[]>> {
    return getUniqueValues('cuisine_type', (data) =>
        data.flatMap((e: any) => e.cuisine_type || []).filter((c: string) => c && c !== 'Cafe')
    )
}

// Get unique item categories from items_ordered array
export async function getUniqueItemCategories(): Promise<ActionResponse<string[]>> {
    return getUniqueValues('items_ordered', (data) =>
        data.flatMap((e: any) => e.items_ordered || []).map((item: any) => item.category).filter(Boolean)
    )
}

// Get unique cities
export async function getUniqueCities(): Promise<ActionResponse<string[]>> {
    return getUniqueValues('city')
}

// Get unique categories
export async function getUniqueCategories(): Promise<ActionResponse<string[]>> {
    return getUniqueValues('category')
}
