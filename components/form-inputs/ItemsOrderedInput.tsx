"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Star, X, Plus, Upload, Camera, Check, ChevronsUpDown, Edit2, Loader2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { convertHeicToJpeg } from "@/lib/heic-utils"
import { toast } from "sonner"
import { ItemOrdered } from "@/lib/database.types"
import { formatDualCurrency } from "@/lib/food-types"
import { Badge } from "@/components/ui/badge"
import { ImageCropDialog } from "./ImageCropDialog"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ItemWithPreview extends ItemOrdered {
    file?: File
    preview?: string
    // Legacy support while migrating
    categories?: string[] | null
}

interface ItemsOrderedInputProps {
    value: ItemWithPreview[]
    onChange: (value: ItemWithPreview[]) => void
    favoriteItem: string | null
    onFavoriteChange: (value: string | null) => void
    availableCategories: string[]
}

function CategoryEdit({
    value,
    onChange,
    options
}: {
    value: string[],
    onChange: (val: string[]) => void,
    options: string[]
}) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState("")

    const toggleCategory = (category: string) => {
        const normalized = category.trim()
        if (!normalized) return

        if (value.includes(normalized)) {
            onChange(value.filter(v => v !== normalized))
        } else {
            onChange([...value, normalized])
        }
        setInputValue("")
    }

    return (
        <div className="flex flex-wrap gap-1 items-center">
            {value.map(cat => (
                <Badge key={cat} variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 hover:bg-secondary/80">
                    {cat}
                    <button
                        type="button"
                        onClick={() => onChange(value.filter(v => v !== cat))}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full">
                        <Plus className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Category..."
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            <CommandEmpty>
                                <button
                                    type="button"
                                    className="w-full text-left px-2 py-1 text-sm text-primary hover:bg-muted"
                                    onClick={() => {
                                        toggleCategory(inputValue)
                                        setOpen(false)
                                    }}
                                >
                                    Create "{inputValue}"
                                </button>
                            </CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                {options.filter(o => !value.includes(o)).map(option => (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={() => {
                                            toggleCategory(option)
                                        }}
                                    >
                                        {option}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export function ItemsOrderedInput({
    value,
    onChange,
    favoriteItem,
    onFavoriteChange,
    availableCategories,
}: ItemsOrderedInputProps) {
    const [newItemName, setNewItemName] = useState("")
    const [newItemPrice, setNewItemPrice] = useState("")
    // We'll store new item categories in a state
    const [newItemCategories, setNewItemCategories] = useState<string[]>([])

    // Crop/Edit state
    const [cropImage, setCropImage] = useState<{ index: number; src: string } | null>(null)
    const [isConverting, setIsConverting] = useState(false)

    const convertHeicIfNeeded = async (file: File): Promise<File> => {
        try {
            setIsConverting(true)
            return await convertHeicToJpeg(file)
        } catch (error) {
            console.error("Error converting HEIC:", error)
            toast.error("Failed to convert HEIC image. Please try a different format.")
            throw error
        } finally {
            setIsConverting(false)
        }
    }

    // Legacy fix: ensure all items have categories array
    useEffect(() => {
        const needsUpdate = value.some(item => !item.categories && item.category)
        if (needsUpdate) {
            onChange(value.map(item => ({
                ...item,
                categories: item.categories || (item.category ? [item.category] : [])
            })))
        }
    }, []) // Run once on mount

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
    const nameInputRef = useRef<HTMLInputElement>(null)

    const addItem = () => {
        if (newItemName.trim()) {
            const newItem: ItemWithPreview = {
                name: newItemName.trim(),
                price: newItemPrice ? parseFloat(newItemPrice) : null,
                image_url: null,
                categories: newItemCategories.length > 0 ? newItemCategories : null,
                category: newItemCategories[0] || null, // Backwards compatibility
            }
            onChange([...value, newItem])
            setNewItemName("")
            setNewItemPrice("")
            setNewItemCategories([])
            requestAnimationFrame(() => nameInputRef.current?.focus())
        }
    }

    const removeItem = (index: number) => {
        const item = value[index]
        if (favoriteItem === item.name) {
            onFavoriteChange(null)
        }
        onChange(value.filter((_, i) => i !== index))
    }

    const duplicateItem = (index: number) => {
        const item = value[index]
        const copy: ItemWithPreview = {
            name: item.name,
            price: item.price,
            image_url: null,
            categories: item.categories ?? (item.category ? [item.category] : null),
            category: item.category ?? item.categories?.[0] ?? null,
        }
        onChange([...value.slice(0, index + 1), copy, ...value.slice(index + 1)])
    }

    const updateItemName = (index: number, name: string) => {
        const updated = [...value]
        updated[index] = { ...updated[index], name }
        onChange(updated)
    }

    const updateItemPrice = (index: number, price: string) => {
        const updated = [...value]
        updated[index] = { ...updated[index], price: price ? parseFloat(price) : null }
        onChange(updated)
    }

    const updateItemCategories = (index: number, categories: string[]) => {
        const updated = [...value]
        updated[index] = {
            ...updated[index],
            categories,
            category: categories[0] || null // Keep legacy sync
        }
        onChange(updated)
    }

    const handleItemImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image too large (max 5MB)")
            return
        }

        try {
            setIsConverting(true)
            const processedFile = await convertHeicIfNeeded(file)

            const reader = new FileReader()
            reader.onloadend = () => {
                const updated = [...value]
                updated[index] = {
                    ...updated[index],
                    file: processedFile,
                    preview: reader.result as string
                }
                onChange(updated)
            }
            reader.readAsDataURL(processedFile)
        } catch (error) {
            // Error handled in convertHeicIfNeeded
        } finally {
            setIsConverting(false)
            // Reset input
            if (fileInputRefs.current[`file_${index}`]) {
                fileInputRefs.current[`file_${index}`]!.value = ''
            }
            if (fileInputRefs.current[`camera_${index}`]) {
                fileInputRefs.current[`camera_${index}`]!.value = ''
            }
        }
    }

    const handleEditImage = (index: number) => {
        const item = value[index];
        const preview = item.preview || item.image_url;
        if (preview) {
            setCropImage({ index, src: preview })
        }
    }

    const handleCropComplete = (croppedImageUrl: string) => {
        if (cropImage === null) return

        // Convert base64 to File
        fetch(croppedImageUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' })
                const updated = [...value]
                updated[cropImage.index] = {
                    ...updated[cropImage.index],
                    file,
                    preview: croppedImageUrl
                }
                onChange(updated)
            })

        setCropImage(null)
    }

    const removeItemImage = (index: number) => {
        const updated = [...value]
        updated[index] = {
            ...updated[index],
            file: undefined,
            preview: undefined,
            image_url: null
        }
        onChange(updated)
    }

    // Calculate total from items
    const total = value.reduce((sum, item) => sum + (item.price || 0), 0)

    return (
        <div className="space-y-4">
            <Label className="text-sm">Items Ordered</Label>

            {/* Add new item */}
            <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/20">
                <span className="text-xs font-medium text-muted-foreground">Add New Item</span>
                <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                        <Input
                            ref={nameInputRef}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Item name..."
                            className="h-9"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    addItem()
                                }
                            }}
                        />
                        <CategoryEdit
                            value={newItemCategories}
                            onChange={setNewItemCategories}
                            options={availableCategories}
                        />
                    </div>
                    <Input
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="$0"
                        type="number"
                        step="0.01"
                        className="w-20 h-9"
                    />
                    <Button type="button" variant="secondary" size="icon" className="h-9 w-9 shrink-0" onClick={addItem}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Items list */}
            {value.length > 0 && (
                <div className="space-y-3">
                    {value.map((item, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm space-y-2"
                        >
                            <div className="flex items-start gap-3">
                                {/* Item image preview or add buttons */}
                                <div className="relative flex-shrink-0 mt-1">
                                    {item.preview || item.image_url ? (
                                        <div className="relative w-12 h-12 rounded-md overflow-hidden ring-1 ring-border group/image">
                                            <Image
                                                src={item.preview || item.image_url || ''}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                            {/* Edit/Remove Overlay */}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditImage(index)}
                                                    className="p-1 rounded-full bg-white/20 text-white hover:bg-white/40"
                                                    title="Crop image"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItemImage(index)}
                                                    className="p-1 rounded-full bg-destructive/80 text-white hover:bg-destructive"
                                                    title="Remove image"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[`file_${index}`]?.click()}
                                                disabled={isConverting}
                                                className="w-12 h-12 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/50 disabled:opacity-50"
                                                title="Upload photo"
                                            >
                                                {isConverting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Camera className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        ref={(el) => { fileInputRefs.current[`file_${index}`] = el }}
                                        type="file"
                                        accept="image/*,.heic,.heif"
                                        className="hidden"
                                        onChange={(e) => handleItemImage(index, e)}
                                    />
                                    <input
                                        ref={(el) => { fileInputRefs.current[`camera_${index}`] = el }}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={(e) => handleItemImage(index, e)}
                                    />
                                </div>

                                {/* Item details */}
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateItemName(index, e.target.value)}
                                            className="h-8 text-sm font-medium"
                                            placeholder="Item name"
                                        />
                                        <Input
                                            value={item.price?.toString() || ""}
                                            onChange={(e) => updateItemPrice(index, e.target.value)}
                                            placeholder="$0"
                                            type="number"
                                            step="0.01"
                                            className="w-20 h-8 text-sm"
                                        />
                                    </div>

                                    <CategoryEdit
                                        value={item.categories || (item.category ? [item.category] : [])}
                                        onChange={(cats) => updateItemCategories(index, cats)}
                                        options={availableCategories}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onFavoriteChange(favoriteItem === item.name ? null : item.name)}
                                        className={cn(
                                            "p-1.5 rounded-md hover:bg-muted transition-colors",
                                            favoriteItem === item.name
                                                ? "text-amber-500"
                                                : "text-muted-foreground hover:text-amber-500"
                                        )}
                                        title="Set as favorite"
                                    >
                                        <Star className={cn("h-4 w-4", favoriteItem === item.name && "fill-current")} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => duplicateItem(index)}
                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                                        title="Duplicate item"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Total display */}
                    {total > 0 && (
                        <div className="flex items-center justify-between pt-2 px-1">
                            <span className="text-sm font-medium text-muted-foreground">Items Total</span>
                            <span className="font-mono text-base font-semibold">{formatDualCurrency(total)}</span>
                        </div>
                    )}
                </div>
            )}


            {/* Crop Dialog */}
            {
                cropImage && (
                    <ImageCropDialog
                        open={!!cropImage}
                        onOpenChange={(open) => !open && setCropImage(null)}
                        imageSrc={cropImage.src}
                        onCropComplete={handleCropComplete}
                    />
                )
            }
        </div >
    )
}

export type { ItemWithPreview }
