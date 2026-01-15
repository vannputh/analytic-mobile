"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface MultiSelectProps {
    label: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
    className?: string
}

export function MultiSelect({ label, options, selected, onChange, className }: MultiSelectProps) {
    const [open, setOpen] = useState(false)

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter((s) => s !== option))
        } else {
            onChange([...selected, option])
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 border-dashed font-mono text-xs",
                        selected.length > 0 && "border-foreground/50",
                        className
                    )}
                >
                    {label}
                    {selected.length > 0 && (
                        <Badge
                            variant="secondary"
                            className="ml-1.5 rounded-sm px-1 font-mono text-[10px]"
                        >
                            {selected.length}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    {options.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">No options</p>
                    ) : (
                        options.map((option) => (
                            <button
                                key={option}
                                onClick={() => toggleOption(option)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors text-left font-mono",
                                    selected.includes(option) && "bg-accent"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-3 h-3 border rounded-sm flex items-center justify-center",
                                        selected.includes(option) && "bg-foreground border-foreground"
                                    )}
                                >
                                    {selected.includes(option) && (
                                        <span className="text-background text-[8px]">✓</span>
                                    )}
                                </div>
                                <span className="truncate">{option}</span>
                            </button>
                        ))
                    )}
                </div>
                {selected.length > 0 && (
                    <>
                        <Separator className="my-2" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => onChange([])}
                        >
                            Clear selection
                        </Button>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}

export default MultiSelect
