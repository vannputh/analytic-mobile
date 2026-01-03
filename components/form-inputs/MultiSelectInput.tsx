"use client"

import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

interface MultiSelectInputProps {
    label: string
    options: readonly string[]
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
}

export function MultiSelectInput({
    label,
    options,
    value,
    onChange,
    placeholder,
}: MultiSelectInputProps) {
    const toggleOption = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter((v) => v !== option))
        } else {
            onChange([...value, option])
        }
    }

    return (
        <div className="space-y-2">
            <Label className="text-sm">{label}</Label>
            <div className="flex flex-wrap gap-1 min-h-[38px] p-2 border rounded-md bg-background">
                {value.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{placeholder || "Select..."}</span>
                ) : (
                    value.map((v) => (
                        <Badge key={v} variant="secondary" className="gap-1">
                            {v}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((val) => val !== v))}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))
                )}
            </div>
            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                {options.filter((o) => !value.includes(o)).map((option) => (
                    <Badge
                        key={option}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => toggleOption(option)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        {option}
                    </Badge>
                ))}
            </div>
        </div>
    )
}
