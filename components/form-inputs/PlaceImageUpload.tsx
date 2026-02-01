"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Star, X, Upload, Camera, Edit2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ImageCropDialog } from "./ImageCropDialog"
import { toast } from "sonner"

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
    const [cropImage, setCropImage] = useState<{ index: number; src: string } | null>(null)
    const [isConverting, setIsConverting] = useState(false)

    // Convert HEIC to JPEG if needed
    const convertHeicIfNeeded = async (file: File): Promise<File> => {
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
            file.name.toLowerCase().endsWith('.heic') ||
            file.name.toLowerCase().endsWith('.heif')

        if (!isHeic) {
            return file
        }

        try {
            setIsConverting(true)
            // Dynamically import heic2any to reduce bundle size
            const heic2any = (await import('heic2any')).default

            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.95
            })

            // heic2any can return an array or a single blob
            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

            // Create a new File from the converted blob
            const convertedFile = new File(
                [blob],
                file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
                { type: 'image/jpeg' }
            )

            return convertedFile
        } catch (error) {
            console.error('Error converting HEIC:', error)
            toast.error('Failed to convert HEIC image. Please try a different format.')
            throw error
        } finally {
            setIsConverting(false)
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsConverting(true)
        try {
            // Convert HEIC files if needed
            const convertedFiles: File[] = []
            for (const file of Array.from(files)) {
                try {
                    const convertedFile = await convertHeicIfNeeded(file)
                    convertedFiles.push(convertedFile)
                } catch (error) {
                    // Skip files that failed conversion
                    continue
                }
            }

            // Create a new event with converted files
            const dataTransfer = new DataTransfer()
            convertedFiles.forEach(file => dataTransfer.items.add(file))

            const newEvent = {
                ...e,
                target: {
                    ...e.target,
                    files: dataTransfer.files
                }
            } as React.ChangeEvent<HTMLInputElement>

            await onFileSelect(newEvent)
        } finally {
            setIsConverting(false)
            // Reset inputs
            if (fileInputRef.current) fileInputRef.current.value = ''
            if (cameraInputRef.current) cameraInputRef.current.value = ''
        }
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

    const handleEditImage = (index: number) => {
        setCropImage({ index, src: images[index].preview })
    }

    const handleCropComplete = (croppedImageUrl: string) => {
        if (cropImage === null) return

        const newImages = [...images]
        // Convert base64 to File
        fetch(croppedImageUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' })
                newImages[cropImage.index] = {
                    file,
                    preview: croppedImageUrl,
                    is_primary: images[cropImage.index].is_primary
                }
                onImagesChange(newImages)
            })

        setCropImage(null)
    }

    return (
        <>
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
                                        onClick={() => handleEditImage(index)}
                                        className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                                        title="Crop image"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </button>
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
                                        className="p-1.5 bg-destructive/80 text-white rounded-full hover:bg-destructive transition-colors"
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
                        disabled={isConverting}
                    >
                        {isConverting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Converting...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isConverting}
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
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

            {/* Crop Dialog */}
            {cropImage && (
                <ImageCropDialog
                    open={!!cropImage}
                    onOpenChange={(open) => !open && setCropImage(null)}
                    imageSrc={cropImage.src}
                    onCropComplete={handleCropComplete}
                />
            )}
        </>
    )
}

export type { PlaceImage }
