"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, PlayCircle } from "lucide-react"
import { WatchingCard } from "@/components/watching-card"
import { WatchingCardSkeleton } from "@/components/skeletons"
import { MediaEntry } from "@/lib/database.types"

interface WatchingSectionProps {
    entries: MediaEntry[]
    loading: boolean
    onUpdate: (updatedEntry: MediaEntry) => void
}

export function WatchingSection({ entries, loading, onUpdate }: WatchingSectionProps) {
    const [collapsed, setCollapsed] = useState(false)

    if (!loading && entries.length === 0) return null

    return (
        <div className="mb-6">
            <button
                type="button"
                className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <PlayCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Currently Watching</h2>
                {entries.length > 0 && (
                    <span className="text-sm text-muted-foreground">({entries.length})</span>
                )}
            </button>
            {!collapsed && (
                <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex-shrink-0 w-72">
                                    <WatchingCardSkeleton />
                                </div>
                            ))
                        ) : (
                            entries.map((entry) => (
                                <div key={entry.id} className="flex-shrink-0 w-72">
                                    <WatchingCard
                                        entry={entry}
                                        onUpdate={onUpdate}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
