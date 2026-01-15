"use client"

import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SafeImage } from "@/components/ui/safe-image"
import { MediaEntryInsert } from "@/lib/database.types"

interface PosterSectionProps {
    formData: MediaEntryInsert
    setFormData: (data: MediaEntryInsert) => void
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    uploadingImage: boolean
}

export function PosterSection({
    formData,
    setFormData,
    handleImageUpload,
    uploadingImage
}: PosterSectionProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="poster_url" className="text-sm font-mono">
                Poster URL
            </Label>
            <div className="flex gap-2">
                <Input
                    id="poster_url"
                    type="url"
                    value={formData.poster_url || ""}
                    onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                />
                <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImage}
                    className="gap-2"
                >
                    {uploadingImage ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4" />
                            Upload
                        </>
                    )}
                </Button>
            </div>
            {formData.poster_url && (
                <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted">
                    <SafeImage
                        src={formData.poster_url}
                        alt="Poster preview"
                        fill
                        className="object-contain"
                        fallbackElement={
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Invalid image URL
                            </div>
                        }
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => setFormData({ ...formData, poster_url: null })}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
