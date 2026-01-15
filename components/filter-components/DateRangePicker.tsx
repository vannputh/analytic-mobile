"use client"

import { useState } from "react"
import { format } from "date-fns/format"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface DateRangePickerProps {
    from: string | null
    to: string | null
    onChange: (from: string | null, to: string | null) => void
    className?: string
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
    const [open, setOpen] = useState(false)

    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 border-dashed font-mono text-xs justify-start",
                        (from || to) && "border-foreground/50",
                        className
                    )}
                >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {from || to ? (
                        <>
                            {from ? format(new Date(from), "MMM d, yy") : "Start"}
                            {" → "}
                            {to ? format(new Date(to), "MMM d, yy") : "Now"}
                        </>
                    ) : (
                        "Date Range"
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-h-[80vh] overflow-y-auto" align="start">
                <div className="flex flex-col sm:flex-row">
                    <div className="p-2 border-b sm:border-b-0 sm:border-r">
                        <p className="text-xs text-muted-foreground mb-2 px-2">From</p>
                        <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={(date) => {
                                onChange(date ? format(date, "yyyy-MM-dd") : null, to)
                            }}
                            initialFocus
                        />
                    </div>
                    <div className="p-2">
                        <p className="text-xs text-muted-foreground mb-2 px-2">To</p>
                        <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={(date) => {
                                onChange(from, date ? format(date, "yyyy-MM-dd") : null)
                            }}
                        />
                    </div>
                </div>
                <Separator />
                <div className="p-2 flex flex-wrap gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 min-w-[4rem] h-7 text-xs"
                        onClick={() => {
                            onChange(null, null)
                            setOpen(false)
                        }}
                    >
                        Clear
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 min-w-[4rem] h-7 text-xs"
                        onClick={() => {
                            const now = new Date()
                            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
                            onChange(format(yearAgo, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"))
                        }}
                    >
                        Last Year
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 min-w-[4rem] h-7 text-xs"
                        onClick={() => {
                            const now = new Date()
                            const startOfYear = new Date(now.getFullYear(), 0, 1)
                            onChange(format(startOfYear, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"))
                        }}
                    >
                        This Year
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default DateRangePicker
