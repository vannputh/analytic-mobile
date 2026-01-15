"use client"

import { Loader2, Sparkles } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface ImportPasteAreaProps {
    pastedData: string
    setPastedData: (data: string) => void
    cleaning: boolean
    elapsedSeconds: number
}

export function ImportPasteArea({
    pastedData,
    setPastedData,
    cleaning,
    elapsedSeconds
}: ImportPasteAreaProps) {
    return (
        <div className="relative">
            <Textarea
                placeholder="Paste CSV/TSV data here (include headers)..."
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                className="min-h-[150px] font-mono text-xs"
                disabled={cleaning}
            />
            {cleaning && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" />
                            AI cleaning data...
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                            {elapsedSeconds}s
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
