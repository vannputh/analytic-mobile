"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { ChevronLeft, ChevronRight, Plus, MapPin, Star, Utensils } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FoodEntry } from "@/lib/database.types"
import { getFoodEntriesByMonth } from "@/lib/food-actions"
import { FoodEntryCard } from "./food-entry-card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDayCell } from "@/components/food/CalendarDayCell"

interface FoodCalendarViewProps {
    onAddEntry: () => void
    onViewEntry: (entry: FoodEntry) => void
    onEditEntry: (entry: FoodEntry) => void
    refreshTrigger?: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay()
}

function formatMonthYear(year: number, month: number): string {
    return new Date(year, month).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    })
}

export function FoodCalendarView({ onAddEntry, onViewEntry, onEditEntry, refreshTrigger }: FoodCalendarViewProps) {
    const today = new Date()
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(today.getMonth())
    const [entriesByDate, setEntriesByDate] = useState<Record<string, FoodEntry[]>>({})
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    // Fetch entries for current month
    useEffect(() => {
        let isMounted = true

        async function fetchEntries() {
            setLoading(true)
            try {
                const result = await getFoodEntriesByMonth(currentYear, currentMonth + 1, true)
                if (isMounted && result.success) {
                    setEntriesByDate(result.data)
                }
            } catch (error) {
                console.error("Failed to fetch food entries:", error)
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchEntries()

        return () => {
            isMounted = false
        }
    }, [currentYear, currentMonth, refreshTrigger])

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)

    const calendarDays = useMemo(() => {
        const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = []

        // Previous month days to fill the first week
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
        const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i
            const date = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            days.push({ date, day, isCurrentMonth: false, isToday: false })
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isToday =
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear()
            days.push({ date, day, isCurrentMonth: true, isToday })
        }

        // Next month days to fill the last week
        const remainingDays = 42 - days.length // 6 weeks * 7 days
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear

        for (let day = 1; day <= remainingDays; day++) {
            const date = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            days.push({ date, day, isCurrentMonth: false, isToday: false })
        }

        return days
    }, [currentYear, currentMonth, daysInMonth, firstDayOfMonth, today])

    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentYear(currentYear - 1)
            setCurrentMonth(11)
        } else {
            setCurrentMonth(currentMonth - 1)
        }
        setSelectedDate(null)
    }

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentYear(currentYear + 1)
            setCurrentMonth(0)
        } else {
            setCurrentMonth(currentMonth + 1)
        }
        setSelectedDate(null)
    }

    const goToToday = () => {
        setCurrentYear(today.getFullYear())
        setCurrentMonth(today.getMonth())
        setSelectedDate(null)
    }

    const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : []

    return (
        <div className="space-y-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToToday} className="hidden sm:inline-flex">
                        Today
                    </Button>
                </div>

                <div className="flex-1" />

                <h2 className="text-lg font-semibold font-mono">
                    {formatMonthYear(currentYear, currentMonth)}
                </h2>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-lg overflow-hidden bg-card">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-muted/50">
                    {WEEKDAYS.map((day, i) => (
                        <div
                            key={day}
                            className="p-2 text-center text-xs font-medium text-muted-foreground border-b"
                        >
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((dayInfo, index) => {
                        const entries = entriesByDate[dayInfo.date] || []
                        const isSelected = selectedDate === dayInfo.date

                        return (
                            <CalendarDayCell
                                key={`${dayInfo.date}-${index}`}
                                date={dayInfo.date}
                                day={dayInfo.day}
                                isCurrentMonth={dayInfo.isCurrentMonth}
                                isToday={dayInfo.isToday}
                                isSelected={isSelected}
                                entries={entries}
                                loading={loading}
                                onClick={() => setSelectedDate(isSelected ? null : dayInfo.date)}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Selected Date Entries */}
            {selectedDate && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium font-mono">
                            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {selectedEntries.length} {selectedEntries.length === 1 ? "entry" : "entries"}
                        </span>
                    </div>

                    {selectedEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg">
                            <Utensils className="h-8 w-8 opacity-30 mb-2" />
                            <p className="text-sm mb-3">No entries for this day</p>
                            <Button variant="outline" size="sm" onClick={onAddEntry}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Entry
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {selectedEntries.map((entry) => (
                                <FoodEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    onClick={() => onViewEntry(entry)}
                                    onEdit={() => onEditEntry(entry)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All month entries when no date selected */}
            {!selectedDate && !loading && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium font-mono">
                            All Entries for {formatMonthYear(currentYear, currentMonth)}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {Object.values(entriesByDate).reduce((sum, arr) => sum + arr.length, 0)} entries
                        </span>
                    </div>

                    {Object.values(entriesByDate).flat().length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg">
                            <Utensils className="h-8 w-8 opacity-30 mb-2" />
                            <p className="text-sm mb-3">No entries this month</p>
                            <Button variant="outline" size="sm" onClick={onAddEntry}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Entry
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(entriesByDate)
                                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                                .flatMap(([_, entries]) => entries)
                                .map((entry) => (
                                    <FoodEntryCard
                                        key={entry.id}
                                        entry={entry}
                                        onClick={() => onViewEntry(entry)}
                                        onEdit={() => onEditEntry(entry)}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default FoodCalendarView
