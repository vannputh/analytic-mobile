"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Calendar, Pencil, Edit } from "lucide-react";
import { MediaEntry } from "@/lib/database.types";
import { getPlaceholderPoster } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";
import { StarRatingDisplay } from "@/components/form-inputs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MediaDetailsDialog = dynamic(
  () =>
    import("@/components/media-details-dialog").then((m) => m.MediaDetailsDialog),
  { ssr: false }
);

interface WatchedDiaryTableProps {
  entries: MediaEntry[];
  onEdit?: (entry: MediaEntry) => void;
  onDelete?: (id: string) => void;
  onEntryUpdate?: (updatedEntry: MediaEntry) => void;
}

function getMonthKey(finishDate: string | null): string | null {
  if (!finishDate) return null;
  const d = new Date(finishDate);
  if (isNaN(d.getTime())) return null;
  return format(d, "yyyy-MM");
}

function getDay(finishDate: string | null): string {
  if (!finishDate) return "—";
  const d = new Date(finishDate);
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd");
}

function getMonthLabel(finishDate: string | null): string {
  if (!finishDate) return "—";
  const d = new Date(finishDate);
  if (isNaN(d.getTime())) return "—";
  return format(d, "MMM yyyy").toUpperCase();
}

export function WatchedDiaryTable({
  entries,
  onEdit,
  onDelete,
  onEntryUpdate,
}: WatchedDiaryTableProps) {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);

  const groups = useMemo(() => {
    const withDate = entries.filter((e) => e.finish_date);
    const byMonth = new Map<string, MediaEntry[]>();
    for (const entry of withDate) {
      const key = getMonthKey(entry.finish_date);
      if (key) {
        const list = byMonth.get(key) ?? [];
        list.push(entry);
        byMonth.set(key, list);
      }
    }
    return Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const openDetails = (entry: MediaEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedEntry(entry);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (entry: MediaEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(entry);
  };

  if (entries.length === 0 || groups.length === 0) {
    return (
      <div className="rounded-md border py-12 text-center text-muted-foreground text-sm">
        No watched entries in this view.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] text-muted-foreground uppercase text-xs">
                Month
              </TableHead>
              <TableHead className="w-[60px] text-muted-foreground uppercase text-xs">
                Day
              </TableHead>
              <TableHead className="text-muted-foreground uppercase text-xs">
                Film
              </TableHead>
              <TableHead className="w-[80px] text-muted-foreground uppercase text-xs">
                Released
              </TableHead>
              <TableHead className="w-[100px] text-muted-foreground uppercase text-xs">
                Rating
              </TableHead>
              <TableHead className="w-[100px] text-right text-muted-foreground uppercase text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.flatMap(([monthKey, groupEntries]) => {
              const monthLabel = groupEntries[0]
                ? getMonthLabel(groupEntries[0].finish_date)
                : monthKey;
              return groupEntries.map((entry, idx) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors border-b"
                  onClick={() => openDetails(entry)}
                >
                  {idx === 0 ? (
                    <TableCell
                      rowSpan={groupEntries.length}
                      className="align-top py-3 pr-2 border-r"
                      style={{ verticalAlign: "top" }}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium text-foreground text-sm">
                          {monthLabel}
                        </span>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="py-3 font-mono text-sm tabular-nums">
                    {getDay(entry.finish_date)}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 relative bg-muted rounded flex-shrink-0 overflow-hidden">
                        <SafeImage
                          src={entry.poster_url ?? ""}
                          alt={entry.title}
                          fill
                          className="object-cover"
                          fallbackElement={
                            <span className="text-xl flex items-center justify-center h-full">
                              {getPlaceholderPoster(entry.type)}
                            </span>
                          }
                        />
                      </div>
                      <span className="font-medium">{entry.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground text-sm">
                    —
                  </TableCell>
                  <TableCell className="py-3">
                    {entry.my_rating != null ? (
                      <StarRatingDisplay
                        rating={entry.my_rating}
                        max={10}
                        size="sm"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => openDetails(entry, e)}
                        title="Review"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleEdit(entry, e)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ));
            })}
          </TableBody>
        </Table>
      </div>

      <MediaDetailsDialog
        entry={selectedEntry}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onSuccess={(updated) => {
          onEntryUpdate?.(updated);
        }}
        onDelete={onDelete}
      />
    </div>
  );
}

