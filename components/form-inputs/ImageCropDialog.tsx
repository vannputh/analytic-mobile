"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface ImageCropDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    imageSrc: string
    onCropComplete: (croppedImage: string) => void
}

interface CropArea {
    x: number
    y: number
    width: number
    height: number
}

const ASPECT_RATIOS = [
    { label: "Free", value: null },
    { label: "Square (1:1)", value: 1 },
    { label: "4:3", value: 4 / 3 },
    { label: "16:9", value: 16 / 9 },
    { label: "3:4 (Portrait)", value: 3 / 4 },
]

export function ImageCropDialog({ open, onOpenChange, imageSrc, onCropComplete }: ImageCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
    const [isCropping, setIsCropping] = useState(false)

    const onCropChange = useCallback((crop: { x: number; y: number }) => {
        setCrop(crop)
    }, [])

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom)
    }, [])

    const onCropAreaChange = useCallback(
        (croppedArea: CropArea, croppedAreaPixels: CropArea) => {
            setCroppedAreaPixels(croppedAreaPixels)
        },
        []
    )

    const createCroppedImage = async () => {
        if (!croppedAreaPixels) return

        setIsCropping(true)
        try {
            const image = new Image()
            image.src = imageSrc

            await new Promise((resolve) => {
                image.onload = resolve
            })

            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")

            if (!ctx) {
                throw new Error("Failed to get canvas context")
            }

            // Set canvas size to cropped area
            canvas.width = croppedAreaPixels.width
            canvas.height = croppedAreaPixels.height

            // Draw the cropped image
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            )

            // Convert to base64
            const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.95)
            onCropComplete(croppedImageUrl)
            onOpenChange(false)
        } catch (error) {
            console.error("Error cropping image:", error)
        } finally {
            setIsCropping(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Crop Image</DialogTitle>
                </DialogHeader>

                <div className="flex-1 relative bg-muted/30 rounded-md overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onCropComplete={onCropAreaChange}
                        onZoomChange={onZoomChange}
                        style={{
                            containerStyle: {
                                borderRadius: "0.375rem",
                            },
                        }}
                    />
                </div>

                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label className="text-sm">Aspect Ratio</Label>
                        <Select
                            value={aspectRatio?.toString() ?? "free"}
                            onValueChange={(value) => {
                                if (value === "free") {
                                    setAspectRatio(undefined)
                                } else {
                                    setAspectRatio(parseFloat(value))
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ASPECT_RATIOS.map((ratio) => (
                                    <SelectItem
                                        key={ratio.label}
                                        value={ratio.value?.toString() ?? "free"}
                                    >
                                        {ratio.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm">Zoom</Label>
                        <Slider
                            value={[zoom]}
                            onValueChange={(values) => setZoom(values[0])}
                            min={1}
                            max={3}
                            step={0.1}
                            className="w-full"
                        />
                    </div>
                </div>

                <DialogFooter className="flex gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCropping}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={createCroppedImage}
                        disabled={isCropping}
                    >
                        {isCropping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isCropping ? "Cropping..." : "Apply Crop"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
