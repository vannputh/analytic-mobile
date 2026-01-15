"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface CuisineSelectorProps {
    value: string[]
    onChange: (value: string[]) => void
    options: string[]
    placeholder?: string
}

export function CuisineSelector({
    value,
    onChange,
    options,
    placeholder = "Select cuisine...",
}: CuisineSelectorProps) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState("")

    const handleSelect = (currentValue: string) => {
        if (value.includes(currentValue)) {
            onChange(value.filter((v) => v !== currentValue))
        } else {
            onChange([...value, currentValue])
        }
    }

    const handleCreate = () => {
        if (inputValue.trim() && !value.includes(inputValue.trim())) {
            onChange([...value, inputValue.trim()])
            setInputValue("")
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value.length > 0
                        ? `${value.length} selected`
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search cuisine..." value={inputValue} onValueChange={setInputValue} />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2 text-sm text-center text-muted-foreground">
                                No cuisine found.
                                {inputValue && (
                                    <button
                                        type="button"
                                        onClick={handleCreate}
                                        className="mt-2 block w-full rounded bg-primary px-2 py-1 text-primary-foreground hover:bg-primary/90"
                                    >
                                        Create "{inputValue}"
                                    </button>
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={() => handleSelect(option)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.includes(option) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default CuisineSelector
