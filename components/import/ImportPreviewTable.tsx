"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { MediaEntryInsert } from "@/lib/database.types"

interface ImportPreviewTableProps {
    previewData: MediaEntryInsert[]
    totalRows: number
}

export function ImportPreviewTable({ previewData, totalRows }: ImportPreviewTableProps) {
    if (previewData.length === 0) return null

    return (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Medium</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Rating</TableHead>
                        <TableHead className="text-xs">Genre</TableHead>
                        <TableHead className="text-xs">Platform</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {previewData.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium text-xs">{row.title || "-"}</TableCell>
                            <TableCell className="text-xs">{row.medium || row.type || "-"}</TableCell>
                            <TableCell className="text-xs">{row.status || "-"}</TableCell>
                            <TableCell className="text-xs">
                                {row.my_rating ?? row.rating ?? "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                                {row.genre && Array.isArray(row.genre)
                                    ? row.genre.join(", ")
                                    : row.genre || "-"}
                            </TableCell>
                            <TableCell className="text-xs">{row.platform || "-"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {totalRows > 10 && (
                <div className="p-2 text-xs text-muted-foreground border-t font-mono">
                    Showing 10 of {totalRows} rows
                </div>
            )}
        </div>
    )
}
