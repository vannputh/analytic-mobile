"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { SafeImage } from "@/components/ui/safe-image"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/data-table"

// Generic entity type
export interface BaseEntity {
    id: string
    title: string
    cover_url?: string | null
    status?: string | null
    my_rating?: number | null
}

// Configuration for status badge variants
export type StatusVariants = Record<string, "default" | "secondary" | "outline" | "destructive">

// Column configuration
export interface ColumnConfig<T> {
    key: keyof T | string
    header: string
    sortable?: boolean
    render?: (value: unknown, row: T) => React.ReactNode
    width?: string
}

// Props for the EntityTable component
export interface EntityTableProps<T extends BaseEntity> {
    data: T[]
    columns: ColumnConfig<T>[]
    statusVariants: StatusVariants
    deleteAction: (id: string) => Promise<{ success: boolean; error?: string }>
    deleteConfirmMessage: string
    deleteSuccessMessage: string
    searchPlaceholder: string
    DetailsDialog: React.ComponentType<{
        open: boolean
        onOpenChange: (open: boolean) => void
        entry: T | null
        onSuccess?: () => void
    }>
    coverAspectRatio?: "square" | "portrait"
    secondaryField?: keyof T
    secondaryLabel?: string
}

export function EntityTable<T extends BaseEntity>({
    data,
    columns,
    statusVariants,
    deleteAction,
    deleteConfirmMessage,
    deleteSuccessMessage,
    searchPlaceholder,
    DetailsDialog,
    coverAspectRatio = "portrait",
    secondaryField,
}: EntityTableProps<T>) {
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [selectedEntry, setSelectedEntry] = useState<T | null>(null)

    const handleEdit = (entry: T) => {
        setSelectedEntry(entry)
        setDetailsOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm(deleteConfirmMessage)) return
        try {
            const result = await deleteAction(id)
            if (result.success) {
                toast.success(deleteSuccessMessage)
            } else {
                toast.error(result.error)
            }
        } catch {
            toast.error("Failed to delete")
        }
    }

    // Build columns from config
    const tableColumns: ColumnDef<T>[] = [
        // Cover column
        {
            accessorKey: "cover_url",
            header: "",
            cell: ({ row }) => {
                const cover = row.getValue("cover_url") as string
                const heightClass = coverAspectRatio === "square" ? "h-10" : "h-14"
                return cover ? (
                    <div className={`relative w-10 ${heightClass} group`}>
                        <SafeImage
                            src={cover}
                            alt={row.getValue("title")}
                            fill
                            className="object-cover rounded-sm"
                            sizes="40px"
                            fallbackElement={
                                <div className={`w-10 ${heightClass} bg-zinc-100 dark:bg-zinc-800 rounded-sm flex items-center justify-center absolute inset-0`}>
                                    <Eye className="h-4 w-4 text-zinc-400" />
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className={`w-10 ${heightClass} bg-zinc-100 dark:bg-zinc-800 rounded-sm flex items-center justify-center`}>
                        <Eye className="h-4 w-4 text-zinc-400" />
                    </div>
                )
            },
            enableSorting: false,
        },
        // Title column
        {
            accessorKey: "title",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Title
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-medium max-w-xs truncate" title={row.getValue("title")}>
                    {row.getValue("title")}
                </div>
            ),
        },
        // Dynamic columns from config
        ...columns.map((col): ColumnDef<T> => ({
            accessorKey: col.key as string,
            header: col.sortable
                ? ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        {col.header}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
                : col.header,
            cell: ({ row }) => {
                const value = row.getValue(col.key as string)
                if (col.render) return col.render(value, row.original)
                return <div className="max-w-[150px] truncate">{String(value ?? "—")}</div>
            },
        })),
        // Status column
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return status ? (
                    <Badge variant={statusVariants[status] || "outline"}>
                        {status}
                    </Badge>
                ) : null
            },
            filterFn: (row, id, value) => {
                const rowValue = row.getValue(id) as string
                if (!value) return true
                return rowValue === value
            },
        },
        // Rating column
        {
            accessorKey: "my_rating",
            header: "Rating",
            cell: ({ row }) => {
                const rating = row.getValue("my_rating") as number
                return rating ? (
                    <div className="font-medium text-sm">
                        ★ {rating % 1 === 0 ? rating : rating.toFixed(1)}
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            },
        },
        // Actions column
        {
            id: "actions",
            cell: ({ row }) => {
                const entry = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const renderMobileCard = (entry: T) => {
        const heightClass = coverAspectRatio === "square" ? "h-12" : "h-16"
        const secondary = secondaryField ? String(entry[secondaryField] ?? "") : ""

        return (
            <Card
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleEdit(entry)}
            >
                <CardContent className="p-3">
                    <div className="flex gap-3">
                        <div className={`w-12 ${heightClass} relative bg-muted rounded flex-shrink-0 overflow-hidden`}>
                            {entry.cover_url ? (
                                <SafeImage
                                    src={entry.cover_url}
                                    alt={entry.title}
                                    fill
                                    className="object-cover"
                                    fallbackElement={
                                        <div className="flex items-center justify-center h-full">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    }
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                            <h3 className="font-medium text-sm leading-tight line-clamp-2">{entry.title}</h3>
                            {secondary && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{secondary}</p>
                            )}
                            <div className="mt-1">
                                {entry.status && (
                                    <Badge
                                        variant={statusVariants[entry.status] || "outline"}
                                        className="text-[10px] px-1.5 py-0"
                                    >
                                        {entry.status}
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-auto pt-1">
                                {entry.my_rating ? (
                                    <span className="text-xs font-medium">★ {entry.my_rating}</span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <DataTable
                columns={tableColumns}
                data={data}
                searchPlaceholder={searchPlaceholder}
                renderMobileCard={renderMobileCard}
            />

            <DetailsDialog
                open={detailsOpen}
                onOpenChange={(open) => {
                    setDetailsOpen(open)
                    if (!open) setSelectedEntry(null)
                }}
                entry={selectedEntry}
                onSuccess={() => { }}
            />
        </div>
    )
}
