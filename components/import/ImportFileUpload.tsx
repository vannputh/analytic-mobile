"use client"

import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImportFileUploadProps {
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
    fileInputRef: React.RefObject<HTMLInputElement | null>
}

export function ImportFileUpload({ onFileUpload, fileInputRef }: ImportFileUploadProps) {
    return (
        <div className="flex flex-wrap gap-2 sm:gap-3">
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={onFileUpload}
                className="hidden"
            />
            <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
            >
                <Upload className="h-4 w-4" />
                Upload CSV
            </Button>
            <span className="text-sm text-muted-foreground self-center">or paste below</span>
        </div>
    )
}
