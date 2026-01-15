"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { getEntries, deleteEntry } from "@/lib/actions"
import { MediaEntry } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/client"

export function useMediaEntries() {
    const [allEntries, setAllEntries] = useState<MediaEntry[]>([])
    const [watchingEntries, setWatchingEntries] = useState<MediaEntry[]>([])
    const [watchingLoading, setWatchingLoading] = useState(true)
    const [loading, setLoading] = useState(true)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchEntries = async (isInitial = false) => {
        try {
            setLoading(true)
            setError(null)

            const result = await getEntries({ getCount: true })

            if (!result.success) {
                throw new Error(result.error || "Failed to load entries")
            }

            setAllEntries(result.data || [])
        } catch (err) {
            console.error("Failed to fetch entries:", err)
            const errorMessage = err instanceof Error ? err.message : "Failed to load entries"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setLoading(false)
            if (isInitial) {
                setInitialLoading(false)
            }
        }
    }

    const fetchWatchingEntries = async () => {
        try {
            setWatchingLoading(true)
            const { data, error } = await supabase
                .from("media_entries")
                .select("*")
                .eq("status", "Watching")
                .order("last_watched_at", { ascending: false })
                .order("updated_at", { ascending: false })

            if (error) throw error
            setWatchingEntries(data || [])
        } catch (error) {
            console.error("Error fetching watching entries:", error)
        } finally {
            setWatchingLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true

        const init = async () => {
            await Promise.all([
                fetchEntries(true),
                fetchWatchingEntries()
            ])
        }

        init()

        return () => {
            isMounted = false
        }
    }, [])

    const handleWatchingEntryUpdate = (updatedEntry: MediaEntry) => {
        setWatchingEntries(prev => {
            // If the entry is finished or dropped, remove it from the watching list
            if (updatedEntry.status !== "Watching") {
                return prev.filter(e => e.id !== updatedEntry.id)
            }
            // Otherwise update it and re-sort
            return prev.map(e => e.id === updatedEntry.id ? updatedEntry : e)
                .sort((a, b) => {
                    const dateA = a.last_watched_at ? new Date(a.last_watched_at).getTime() : 0
                    const dateB = b.last_watched_at ? new Date(b.last_watched_at).getTime() : 0
                    return dateB - dateA
                })
        })
        // Also update in allEntries if present
        updateEntryInList(updatedEntry)
    }

    const updateEntryInList = (updatedEntry: MediaEntry) => {
        setAllEntries(prev =>
            prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
        )
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this entry?")) return

        try {
            const result = await deleteEntry(id)

            if (!result.success) {
                throw new Error(result.error || "Failed to delete entry")
            }

            setAllEntries(prev => prev.filter((entry) => entry.id !== id))
            toast.success("Entry deleted successfully")
        } catch (err) {
            console.error("Failed to delete entry:", err)
            toast.error(err instanceof Error ? err.message : "Failed to delete entry")
        }
    }

    return {
        allEntries,
        watchingEntries,
        loading,
        initialLoading,
        watchingLoading,
        error,
        refreshEntries: () => fetchEntries(false),
        refreshWatchingEntries: fetchWatchingEntries,
        handleWatchingEntryUpdate,
        updateEntryInList,
        handleDelete,
    }
}
