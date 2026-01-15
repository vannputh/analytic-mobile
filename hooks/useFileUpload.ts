"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"

interface UseFileUploadOptions {
    maxSizeBytes?: number
    onSuccess?: (url: string) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const { maxSizeBytes = 10 * 1024 * 1024, onSuccess } = options
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        title?: string
    ): Promise<string | null> => {
        const file = e.target.files?.[0]
        if (!file) return null

        if (file.size > maxSizeBytes) {
            toast.error(`File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`)
            return null
        }

        setIsUploading(true)
        const toastId = toast.loading("Uploading cover...")

        try {
            const uploadFormData = new FormData()
            uploadFormData.append('file', file)
            if (title) {
                uploadFormData.append('title', title)
            }

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed')
            }

            toast.success("Cover uploaded successfully", { id: toastId })
            onSuccess?.(data.url)
            return data.url
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Failed to upload cover", { id: toastId })
            return null
        } finally {
            setIsUploading(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    return {
        isUploading,
        fileInputRef,
        handleFileUpload,
        triggerFileInput,
    }
}
