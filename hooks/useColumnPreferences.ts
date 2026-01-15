import { useState, useEffect } from "react"
import { COLUMN_DEFINITIONS, ColumnKey } from "@/components/media-table"
import { getUserPreference, setUserPreference } from "@/lib/user-preferences"

export function useColumnPreferences() {
    const [columnsLoaded, setColumnsLoaded] = useState(false)

    // Initialize with defaults
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
        const defaultVisible = new Set<ColumnKey>()
        Object.entries(COLUMN_DEFINITIONS).forEach(([key, def]) => {
            if (def.defaultVisible) {
                defaultVisible.add(key as ColumnKey)
            }
        })
        return defaultVisible
    })

    // Load column visibility from Supabase
    useEffect(() => {
        async function loadColumns() {
            const saved = await getUserPreference<string[]>("media-table-visible-columns")
            if (saved && Array.isArray(saved)) {
                // Filter to only include valid ColumnKey values
                const validColumns = saved.filter((key): key is ColumnKey =>
                    key in COLUMN_DEFINITIONS
                )
                setVisibleColumns(new Set(validColumns))
            }
            setColumnsLoaded(true)
        }
        loadColumns()
    }, [])

    // Save column visibility to Supabase and notify MediaTable
    useEffect(() => {
        if (!columnsLoaded) return // Don't save until we've loaded initial state

        async function saveColumns() {
            await setUserPreference("media-table-visible-columns", Array.from(visibleColumns))
            // Dispatch custom event to notify MediaTable of changes
            window.dispatchEvent(new CustomEvent("media-table-columns-changed", {
                detail: Array.from(visibleColumns)
            }))
        }
        saveColumns()
    }, [visibleColumns, columnsLoaded])

    const toggleColumn = (key: ColumnKey) => {
        setVisibleColumns(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    return {
        visibleColumns,
        setVisibleColumns, // Keep this for now if needed, or prefer toggleColumn
        toggleColumn,
        columnsLoaded
    }
}
