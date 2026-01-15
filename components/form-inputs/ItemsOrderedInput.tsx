"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Star, X, Plus, Upload, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ItemOrdered } from "@/lib/database.types"
import { formatDualCurrency } from "@/lib/food-types"

interface ItemWithPreview extends ItemOrdered {
    file?: File
    preview?: string
}

interface ItemsOrderedInputProps {
    value: ItemWithPreview[]
    onChange: (value: ItemWithPreview[]) => void
    favoriteItem: string | null
    onFavoriteChange: (value: string | null) => void
    availableCategories: string[]
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
    const [newItemCategory, setNewItemCategory] = useState("")
    const [showCustomCategory, setShowCustomCategory] = useState(false)
    const [categoryInputs, setCategoryInputs] = useState<Record<number, string>>({})
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

    const addItem = () => {
        if (newItemName.trim()) {
            const newItem: ItemWithPreview = {
                name: newItemName.trim(),
                price: newItemPrice ? parseFloat(newItemPrice) : null,
                image_url: null,
                category: newItemCategory.trim() || null,
            }
            onChange([...value, newItem])
            setNewItemName("")
            setNewItemPrice("")
            setNewItemCategory("")
            setShowCustomCategory(false)
        }
    }

    const removeItem = (index: number) => {
        const item = value[index]
        if (favoriteItem === item.name) {
            onFavoriteChange(null)
        }
        onChange(value.filter((_, i) => i !== index))
    }

    const updateItemPrice = (index: number, price: string) => {
        const updated = [...value]
        updated[index] = { ...updated[index], price: price ? parseFloat(price) : null }
        onChange(updated)
    }

    const updateItemCategory = (index: number, category: string) => {
        const updated = [...value]
        updated[index] = { ...updated[index], category: category.trim() || null }
        onChange(updated)
        // Clear the custom input for this item
        setCategoryInputs(prev => ({ ...prev, [index]: '' }))
    }

    const handleItemImage = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image too large (max 5MB)")
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const updated = [...value]
            updated[index] = {
                ...updated[index],
                file,
                preview: reader.result as string
            }
            onChange(updated)
        }
        reader.readAsDataURL(file)
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
            <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                    <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Item name..."
                        className="flex-1 h-9"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                addItem()
                            }
                        }}
                    />
                    {showCustomCategory ? (
                        <Input
                            id="new-category-input"
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            placeholder="New category..."
                            className="w-32 h-9 text-sm"
                            autoFocus
                            onBlur={() => {
                                if (!newItemCategory.trim()) {
                                    setShowCustomCategory(false)
                                }
                            }}
                        />
                    ) : (
                        <Select
                            value={newItemCategory}
                            onValueChange={(val) => {
                                if (val === "__other__") {
                                    setNewItemCategory("")
                                    setShowCustomCategory(true)
                                } else {
                                    setNewItemCategory(val)
                                }
                            }}
                        >
                            <SelectTrigger className="w-32 h-9 text-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                                <SelectItem value="__other__">Other...</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    <Input
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="$0"
                        type="number"
                        step="0.01"
                        className="w-20 h-9"
                    />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={addItem}>
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
                            className="p-3 rounded-lg bg-muted/50 space-y-2"
                        >
                            <div className="flex items-center gap-2">
                                {/* Item image preview or add buttons */}
                                <div className="relative flex-shrink-0">
                                    {item.preview || item.image_url ? (
                                        <div className="relative w-12 h-12 rounded-md overflow-hidden">
                                            <Image
                                                src={item.preview || item.image_url || ''}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeItemImage(index)}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-4 w-4 text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[`file_${index}`]?.click()}
                                                className="w-10 h-10 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                                title="Upload photo"
                                            >
                                                <Upload className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[`camera_${index}`]?.click()}
                                                className="w-10 h-10 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                                title="Take photo"
                                            >
                                                <Camera className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        ref={(el) => { fileInputRefs.current[`file_${index}`] = el }}
                                        type="file"
                                        accept="image/*"
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

                                {/* Item name and category */}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate block">{item.name}</span>
                                    {item.category && (
                                        <span className="text-xs text-muted-foreground">{item.category}</span>
                                    )}
                                </div>

                                {/* Price input */}
                                <Input
                                    value={item.price?.toString() || ""}
                                    onChange={(e) => updateItemPrice(index, e.target.value)}
                                    placeholder="$0"
                                    type="number"
                                    step="0.01"
                                    className="w-20 h-8 text-sm"
                                />

                                {/* Favorite toggle */}
                                <button
                                    type="button"
                                    onClick={() => onFavoriteChange(favoriteItem === item.name ? null : item.name)}
                                    className={cn(
                                        "p-1 rounded-full",
                                        favoriteItem === item.name
                                            ? "text-amber-500"
                                            : "text-muted-foreground hover:text-amber-500"
                                    )}
                                    title="Set as favorite"
                                >
                                    <Star className={cn("h-4 w-4", favoriteItem === item.name && "fill-current")} />
                                </button>

                                {/* Remove button */}
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="p-1 rounded-full text-muted-foreground hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Total display */}
                    {total > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Items Total:</span>
                            <span className="font-mono text-sm">{formatDualCurrency(total)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export type { ItemWithPreview }
