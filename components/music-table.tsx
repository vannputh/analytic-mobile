"use client"

import dynamic from "next/dynamic"
import { MusicEntry } from "@/lib/database.types"
import { Badge } from "@/components/ui/badge"
import { deleteMusicEntry } from "@/lib/music-actions"
import { EntityTable, ColumnConfig, StatusVariants } from "@/components/shared/EntityTable"

// Dynamic import for dialog component - reduces initial bundle size
const MusicDetailsDialog = dynamic(
  () => import("@/components/music-details-dialog").then(m => m.MusicDetailsDialog),
  { ssr: false }
)

const STATUS_VARIANTS: StatusVariants = {
    "Finished": "default",
    "Listening": "secondary",
    "On Repeat": "secondary",
    "Dropped": "destructive",
    "Plan to Listen": "outline",
}

const COLUMNS: ColumnConfig<MusicEntry>[] = [
    {
        key: "artist",
        header: "Artist",
        sortable: true,
    },
    {
        key: "type",
        header: "Type",
        render: (value) => value ? (
            <Badge variant="outline" className="font-normal text-xs">
                {String(value)}
            </Badge>
        ) : null,
    },
]

interface MusicTableProps {
    data: MusicEntry[]
}

export function MusicTable({ data }: MusicTableProps) {
    return (
        <EntityTable<MusicEntry>
            data={data}
            columns={COLUMNS}
            statusVariants={STATUS_VARIANTS}
            deleteAction={deleteMusicEntry}
            deleteConfirmMessage="Are you sure you want to delete this music entry?"
            deleteSuccessMessage="Music deleted"
            searchPlaceholder="Search music..."
            DetailsDialog={MusicDetailsDialog}
            coverAspectRatio="square"
            secondaryField="artist"
        />
    )
}
