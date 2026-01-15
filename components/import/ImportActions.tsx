"use client"

import { Loader2, FileText, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MediaEntryInsert } from "@/lib/database.types"

interface ImportActionsProps {
    onImport: () => void
    onBatchFetch: () => void
    onClear: () => void
    cleaning: boolean
    importing: boolean
    fetching: boolean
    cleanedData: MediaEntryInsert[]
    pastedData: string
    totalRows: number
    fetchProgress: { current: number; total: number }
    importResults: { success: number; failed: number } | null
}

export function ImportActions({
    onImport,
    onBatchFetch,
    onClear,
    cleaning,
    importing,
    fetching,
    cleanedData,
    pastedData,
    totalRows,
    fetchProgress,
    importResults
}: ImportActionsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
                onClick={onImport}
                disabled={cleaning || importing || fetching || cleanedData.length === 0}
            >
                {importing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                    </>
                ) : (
                    <>
                        <FileText className="mr-2 h-4 w-4" />
                        Import {totalRows > 0 && `(${totalRows})`}
                    </>
                )}
            </Button>

            <Button
                variant="outline"
                onClick={onBatchFetch}
                disabled={cleaning || importing || fetching || cleanedData.length === 0}
            >
                {fetching ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching {fetchProgress.current}/{fetchProgress.total}...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Batch Fetch Metadata
                    </>
                )}
            </Button>

            <Button variant="outline" onClick={onClear} disabled={!pastedData || fetching}>
                Clear
            </Button>

            {importResults && (
                <div className="flex items-center gap-4 text-sm font-mono">
                    {importResults.success > 0 && (
                        <span className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            {importResults.success}
                        </span>
                    )}
                    {importResults.failed > 0 && (
                        <span className="flex items-center gap-1.5 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {importResults.failed}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
