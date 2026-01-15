'use server'

import { createClient } from '@/lib/supabase/server'
import { MediaEntry, MediaStatusHistory } from '@/lib/database.types'
import { revalidatePath } from 'next/cache'

/** Revalidate all common paths after data mutations */
function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/dashboard')
  revalidatePath('/movies')
  revalidatePath('/analytics')
  revalidatePath('/books')
  revalidatePath('/music')
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface UniqueFieldValues {
  types: string[]
  statuses: string[]
  mediums: string[]
  platforms: string[]
  languages: string[]
}

export type CreateEntryInput = Partial<Omit<MediaEntry, 'id' | 'created_at' | 'updated_at'>> & { title: string }

export async function createEntry(data: CreateEntryInput): Promise<ActionResponse<MediaEntry>> {
  try {
    const supabase = await createClient()

    const { data: newEntry, error } = await (supabase
      .from('media_entries' as any) as any)
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating entry:', error)
      return { success: false, error: error.message }
    }

    revalidateAll()

    return { success: true, data: newEntry }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function updateEntry(id: string, data: Partial<CreateEntryInput>): Promise<ActionResponse<MediaEntry>> {
  try {
    const supabase = await createClient()

    const { data: updatedEntry, error } = await (supabase
      .from('media_entries' as any) as any)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating entry:', error)
      return { success: false, error: error.message }
    }

    revalidateAll()

    return { success: true, data: updatedEntry }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getEntry(id: string): Promise<ActionResponse<MediaEntry>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('media_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function deleteEntry(id: string): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('media_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting entry:', error)
      return { success: false, error: error.message }
    }

    revalidateAll()

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function batchUploadEntries(entries: CreateEntryInput[]): Promise<ActionResponse<MediaEntry[]> & { count?: number; processedCount?: number }> {
  try {
    const supabase = await createClient()

    // Insert entries in batches of 100 to avoid timeout
    const batchSize = 100
    const results = []

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)

      const { data, error } = await (supabase
        .from('media_entries' as any) as any)
        .insert(batch)
        .select()

      if (error) {
        console.error('Error in batch upload:', error)
        return {
          success: false,
          error: error.message,
          processedCount: i
        }
      }

      results.push(...(data || []))
    }

    revalidateAll()

    return {
      success: true,
      data: results,
      count: results.length
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getEntries(filters?: {
  status?: string
  medium?: string
  search?: string
  limit?: number
  offset?: number
  getCount?: boolean
}): Promise<ActionResponse<MediaEntry[]> & { count?: number | null }> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('media_entries')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.medium) {
      query = query.eq('medium', filters.medium)
    } else {
      // Exclude books from general media entries as they have their own table/view
      // But only if we aren't explicitly asking for them (though we shouldn't be via this action)
      query = query.neq('medium', 'Book')
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    // Get total count if requested (before applying pagination)
    let totalCount: number | null = null
    if (filters?.getCount) {
      const countQuery = supabase
        .from('media_entries')
        .select('*', { count: 'exact', head: true })

      if (filters?.status) {
        countQuery.eq('status', filters.status)
      }
      if (filters?.medium) {
        countQuery.eq('medium', filters.medium)
      }
      if (filters?.search) {
        countQuery.ilike('title', `%${filters.search}%`)
      }

      const { count, error: countError } = await countQuery
      if (!countError) {
        totalCount = count
      }
    }

    // Add pagination if specified
    if (filters?.limit !== undefined && filters?.offset !== undefined) {
      // Use range for pagination (inclusive on both ends)
      query = query.range(filters.offset, filters.offset + filters.limit - 1)
    } else if (filters?.limit !== undefined) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching entries:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: data || [],
      count: totalCount
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getStats() {
  try {
    const supabase = await createClient()
    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`
    const yearEnd = `${currentYear}-12-31`

    // Run all queries in parallel for better performance
    const [totalCountResult, finishedCountResult, priceMediumResult] = await Promise.all([
      // Get total entries count
      supabase
        .from('media_entries')
        .select('*', { count: 'exact', head: true }),

      // Get finished this year count (using database filter)
      supabase
        .from('media_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Finished')
        .gte('finish_date', yearStart)
        .lte('finish_date', yearEnd),

      // Get only price and medium columns
      supabase
        .from('media_entries')
        .select('price, medium')
    ])

    if (totalCountResult.error) {
      console.error('Error fetching total count:', totalCountResult.error)
      return { success: false, error: totalCountResult.error.message }
    }

    if (finishedCountResult.error) {
      console.error('Error fetching finished count:', finishedCountResult.error)
      return { success: false, error: finishedCountResult.error.message }
    }

    if (priceMediumResult.error) {
      console.error('Error fetching price/medium data:', priceMediumResult.error)
      return { success: false, error: priceMediumResult.error.message }
    }

    const totalEntries = totalCountResult.count || 0
    const finishedThisYear = finishedCountResult.count || 0
    const entries = priceMediumResult.data || []

    // Calculate total spent and medium counts from minimal data
    let totalSpent = 0
    const mediumCounts: Record<string, number> = {}

    for (const entry of entries) {
      // Sum prices
      totalSpent += (entry as any).price || 0

      // Count mediums
      const medium = (entry as any).medium || 'Unknown'
      mediumCounts[medium] = (mediumCounts[medium] || 0) + 1
    }

    const topMedium = Object.entries(mediumCounts).sort((a, b) => b[1] - a[1])[0]

    return {
      success: true,
      data: {
        finishedThisYear,
        totalSpent,
        topMedium: topMedium ? topMedium[0] : 'None',
        topMediumCount: topMedium ? topMedium[1] : 0,
        totalEntries,
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

export async function getStatusHistory(mediaEntryId: string): Promise<ActionResponse<MediaStatusHistory[]>> {
  try {
    const supabase = await createClient()

    // Limit to most recent 100 entries for performance
    const { data, error } = await supabase
      .from('media_status_history')
      .select('*')
      .eq('media_entry_id', mediaEntryId)
      .order('changed_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching status history:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function restartEntry(id: string): Promise<ActionResponse<MediaEntry>> {
  try {
    const supabase = await createClient()

    // Get current entry
    const { data: entry, error: fetchError } = await (supabase
      .from('media_entries' as any) as any)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found' }
    }

    // Only restart if currently Dropped or On Hold
    if (entry.status !== 'Dropped' && entry.status !== 'On Hold') {
      return {
        success: false,
        error: 'Can only restart items that are Dropped or On Hold'
      }
    }

    // Update status to In Progress and clear finish_date
    const { data: updatedEntry, error: updateError } = await (supabase
      .from('media_entries' as any) as any)
      .update({
        status: 'Watching',
        finish_date: null,
        start_date: entry.start_date || new Date().toISOString().split('T')[0],
      } as any)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error restarting entry:', updateError)
      return { success: false, error: updateError.message }
    }

    revalidateAll()

    return { success: true, data: updatedEntry }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getUniqueFieldValues(): Promise<ActionResponse<UniqueFieldValues>> {
  try {
    const supabase = await createClient()

    // Get all entries to extract unique values
    const { data, error } = await supabase
      .from('media_entries')
      .select('type, status, medium, platform, language')

    if (error) {
      console.error('Error fetching unique values:', error)
      return { success: false, error: error.message }
    }

    const types = new Set<string>()
    const statuses = new Set<string>()
    const mediums = new Set<string>()
    const platforms = new Set<string>()
    const languages = new Set<string>()

    for (const entry of (data as any[]) || []) {
      if (entry.type) types.add(entry.type)
      if (entry.status) statuses.add(entry.status)
      if (entry.medium) mediums.add(entry.medium)
      if (entry.platform) platforms.add(entry.platform)

      // Handle language which may be string[], JSON string, or plain string
      if (entry.language) {
        let langs: string[] = [];
        const val = entry.language as unknown; // runtime type might differ from TS type

        if (Array.isArray(val)) {
          langs = val;
        } else if (typeof val === 'string') {
          if (val.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) langs = parsed;
            } catch (e) {
              // failed to parse, reuse val as string
              langs = [val];
            }
          } else {
            // Comma separated or single string
            langs = val.split(',').map(s => s.trim());
          }
        }

        langs.forEach(l => {
          if (l) languages.add(l.replace(/['"]+/g, '')); // Remove extra quotes if any crept in
        });
      }
    }

    return {
      success: true,
      data: {
        types: Array.from(types).sort(),
        statuses: Array.from(statuses).sort(),
        mediums: Array.from(mediums).sort(),
        platforms: Array.from(platforms).sort(),
        languages: Array.from(languages).sort(),
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

