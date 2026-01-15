"use client";

import { FoodEntry } from "@/lib/database.types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CalendarDayCellProps {
    date: string;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    entries: FoodEntry[];
    loading: boolean;
    onClick: () => void;
}

export function CalendarDayCell({
    date,
    day,
    isCurrentMonth,
    isToday,
    isSelected,
    entries,
    loading,
    onClick,
}: CalendarDayCellProps) {
    const hasEntries = entries.length > 0;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border-b border-r text-left transition-colors",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
                isToday && "bg-accent/50"
            )}
        >
            {/* Day Number */}
            <span
                className={cn(
                    "inline-flex items-center justify-center text-xs sm:text-sm font-medium",
                    "h-5 w-5 sm:h-6 sm:w-6 rounded-full",
                    isToday && "bg-primary text-primary-foreground"
                )}
            >
                {day}
            </span>

            {/* Entry Indicators */}
            {loading && isCurrentMonth ? (
                <div className="mt-1">
                    <Skeleton className="h-2 w-full" />
                </div>
            ) : hasEntries ? (
                <div className="mt-1 space-y-0.5">
                    {entries.slice(0, 2).map((entry) => (
                        <div
                            key={entry.id}
                            className="flex items-center gap-1 text-[10px] sm:text-xs truncate"
                            title={entry.name}
                        >
                            <span className="text-amber-500">
                                {entry.overall_rating ? "★" : "•"}
                            </span>
                            <span className="truncate">{entry.name}</span>
                        </div>
                    ))}
                    {entries.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                            +{entries.length - 2} more
                        </div>
                    )}
                </div>
            ) : null}
        </button>
    );
}
