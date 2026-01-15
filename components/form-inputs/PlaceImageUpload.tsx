"use client"

import { useRef } from "react"
import Image from "next/image"
import { Star, X, Upload, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PlaceImage {
    file?: File
    preview: string
    is_primary: boolean
}

interface PlaceImageUploadProps {
    images: PlaceImage[]
    onImagesChange: (images: PlaceImage[]) => void
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

export function PlaceImageUpload({
    images,
    onImagesChange,
    onFileSelect,
}: PlaceImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        await onFileSelect(e)

        // Reset inputs
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (cameraInputRef.current) cameraInputRef.current.value = ''
    }

    const removeImage = (index: number) => {
        onImagesChange(images.filter((_, i) => i !== index))
    }

    const togglePrimary = (index: number) => {
        const newImages = images.map((img, i) => ({
            ...img,
            is_primary: i === index ? !img.is_primary : false
        }))
        onImagesChange(newImages)
    }

    return (
        <div className="space-y-3">
            <Label className="text-sm">Place Photos</Label>

            {/* Image previews */}
            {images.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-2">
                    {images.map((img, index) => (
                        <div key={index} className="relative aspect-square group">
                            <div className={cn(
                                "relative w-full h-full rounded-lg overflow-hidden border transition-all",
                                img.is_primary ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                            )}>
                                <Image
                                    src={img.preview}
                                    alt={`Place photo ${index + 1}`}
                                    fill
                                    className="object-cover"
                                />
                                {img.is_primary && (
                                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 py-0.5 rounded uppercase">
                                        Primary
                                    </div>
                                )}
                            </div>

                            {/* Overlay Controls */}
                            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => togglePrimary(index)}
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        img.is_primary ? "bg-primary text-white" : "bg-white/20 text-white hover:bg-white/40"
                                    )}
                                    title={img.is_primary ? "Unset primary" : "Set as primary"}
                                >
                                    <Star className={cn("h-3 w-3", img.is_primary && "fill-current")} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="p-1.5 bg-destructive/80 text-white rounded-full hover:bg-destructive"
                                    title="Remove photo"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload buttons */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                </Button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    )
}

export type { PlaceImage }
