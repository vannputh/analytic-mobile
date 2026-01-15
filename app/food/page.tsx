"use client"

import { useState, useCallback } from "react"
import { FoodEntry } from "@/lib/database.types"
import { FoodCalendarView } from "@/components/food-calendar-view"
import { FoodDetailsDialog } from "@/components/food-details-dialog"
import { FoodAddDialog } from "@/components/food-add-dialog"
import { PageHeader } from "@/components/page-header"

export default function FoodPage() {
    const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null)


    const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleViewEntry = useCallback((entry: FoodEntry) => {
        setSelectedEntry(entry)
        setIsDetailsOpen(true)
    }, [])

    const handleEditEntry = useCallback((entry: FoodEntry) => {
        setEditingEntry(entry)
        setIsDetailsOpen(false)
        setIsAddOpen(true)
    }, [])

    const handleAddEntry = useCallback(() => {
        setEditingEntry(null)
        setIsAddOpen(true)
    }, [])

    const handleDeleteEntry = useCallback((id: string) => {
        setRefreshTrigger((prev) => prev + 1)
    }, [])

    const handleEntrySuccess = useCallback((entry: FoodEntry) => {
        setRefreshTrigger((prev) => prev + 1)
        setIsAddOpen(false)
        setEditingEntry(null)
    }, [])

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <PageHeader title="Food & Drinks" />

            {/* Main Content */}
            <main className="p-4 sm:p-6">
                <FoodCalendarView
                    onAddEntry={handleAddEntry}
                    onViewEntry={handleViewEntry}
                    onEditEntry={handleEditEntry}
                    refreshTrigger={refreshTrigger}
                />
            </main>

            {/* Entry Details Dialog */}
            <FoodDetailsDialog
                entry={selectedEntry}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
            />

            {/* Add/Edit Dialog */}
            <FoodAddDialog
                entry={editingEntry}
                open={isAddOpen}
                onOpenChange={(open) => {
                    setIsAddOpen(open)
                    if (!open) {
                        setEditingEntry(null)
                    }
                }}
                onSuccess={handleEntrySuccess}
            />
        </div>
    )
}
