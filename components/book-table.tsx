"use client"

import { BookEntry } from "@/lib/database.types"
import { Badge } from "@/components/ui/badge"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { deleteBookEntry } from "@/lib/book-actions"
import { EntityTable, ColumnConfig, StatusVariants } from "@/components/shared/EntityTable"

const STATUS_VARIANTS: StatusVariants = {
    "Finished": "default",
    "Reading": "secondary",
    "On Hold": "outline",
    "Dropped": "destructive",
    "Plan to Read": "outline",
}

const COLUMNS: ColumnConfig<BookEntry>[] = [
    {
        key: "author",
        header: "Author",
        sortable: true,
    },
    {
        key: "format",
        header: "Format",
        render: (value) => value ? (
            <Badge variant="outline" className="font-normal">
                {String(value)}
            </Badge>
        ) : null,
    },
    {
        key: "pages",
        header: "Pages",
        render: (value) => value ? (
            <span>{String(value)}</span>
        ) : (
            <span className="text-muted-foreground">—</span>
        ),
    },
]

interface BookTableProps {
    data: BookEntry[]
}

export function BookTable({ data }: BookTableProps) {
    return (
        <EntityTable<BookEntry>
            data={data}
            columns={COLUMNS}
            statusVariants={STATUS_VARIANTS}
            deleteAction={deleteBookEntry}
            deleteConfirmMessage="Are you sure you want to delete this book?"
            deleteSuccessMessage="Book deleted"
            searchPlaceholder="Search books..."
            DetailsDialog={BookDetailsDialog}
            coverAspectRatio="portrait"
            secondaryField="author"
        />
    )
}
