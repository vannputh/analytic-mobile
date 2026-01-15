"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { SafeImage } from "@/components/ui/safe-image";
import { MediaEntry } from "@/lib/database.types";
import { getPlaceholderPoster, formatDate, getTimeTaken } from "@/lib/types";
import { formatLength } from "@/lib/parsing-utils";
import { formatLanguageForDisplay, normalizeLanguage } from "@/lib/language-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Loader2, CheckSquare, Square, Edit, RotateCcw } from "lucide-react";
import { BatchEditDialog } from "@/components/shared/BatchEditDialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYPE_OPTIONS, STATUS_OPTIONS, MEDIUM_OPTIONS } from "@/lib/types";

// Dynamic import for dialog component - reduces initial bundle size
const MediaDetailsDialog = dynamic(
  () => import("@/components/media-details-dialog").then(m => m.MediaDetailsDialog),
  { ssr: false }
);

import { restartEntry } from "@/lib/actions";
import { getUserPreference, setUserPreference } from "@/lib/user-preferences";
import { Card, CardContent } from "@/components/ui/card";
import { EpisodeWatchRecord } from "@/lib/database.types";
import { useSortedEntries } from "@/hooks/useSortedEntries";
import { useBatchMetadataFetch } from "@/hooks/useBatchMetadataFetch";

// Parse episode history from JSON
function parseEpisodeHistory(data: unknown): EpisodeWatchRecord[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is EpisodeWatchRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof item.episode === "number" &&
        typeof item.watched_at === "string"
    );
  }
  return [];
}

interface MediaTableProps {
  entries: MediaEntry[];
  onEdit?: (entry: MediaEntry) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
  onEntryUpdate?: (updatedEntry: MediaEntry) => void;
  showSelectMode?: boolean;
  onSelectModeChange?: (show: boolean) => void;
  columnPicker?: React.ReactNode;
}

type SortColumn =
  | "title"
  | "type"
  | "status"
  | "my_rating"
  | "average_rating"
  | "genre"
  | "platform"
  | "medium"
  | "season"
  | "episodes"
  | "length"
  | "language"
  | "price"
  | "time_taken"
  | "imdb_id"
  | "start_date"
  | "finish_date"
  | null;

type SortDirection = "asc" | "desc" | null;

type ColumnKey =
  | "poster"
  | "title"
  | "type"
  | "status"
  | "my_rating"
  | "average_rating"
  | "genre"
  | "platform"
  | "medium"
  | "season"
  | "episodes"
  | "length"
  | "language"
  | "price"
  | "time_taken"
  | "imdb_id"
  | "start_date"
  | "finish_date";

export type { ColumnKey };
export const COLUMN_DEFINITIONS: Record<ColumnKey, { label: string; defaultVisible: boolean }> = {
  poster: { label: "Poster", defaultVisible: true },
  title: { label: "Title", defaultVisible: true },
  type: { label: "Type", defaultVisible: true },
  status: { label: "Status", defaultVisible: true },
  my_rating: { label: "My Rating", defaultVisible: true },
  average_rating: { label: "Average Rating", defaultVisible: true },
  genre: { label: "Genre", defaultVisible: true },
  platform: { label: "Platform", defaultVisible: true },
  medium: { label: "Medium", defaultVisible: false },
  season: { label: "Season", defaultVisible: false },
  episodes: { label: "Episodes", defaultVisible: false },
  length: { label: "Length", defaultVisible: false },
  language: { label: "Language", defaultVisible: false },
  price: { label: "Price", defaultVisible: false },
  time_taken: { label: "Time Taken", defaultVisible: false },
  imdb_id: { label: "IMDb ID", defaultVisible: false },
  start_date: { label: "Start Date", defaultVisible: true },
  finish_date: { label: "Finish Date", defaultVisible: true },
};

export function MediaTable({ entries, onEdit, onDelete, onRefresh, onEntryUpdate, showSelectMode = false, onSelectModeChange }: MediaTableProps) {
  /* Sorting Logic via Hook */
  const getValueForColumn = (entry: MediaEntry, column: ColumnKey) => {
    switch (column) {
      case "title":
        return entry.title?.toLowerCase() || "";
      case "type":
        return entry.type?.toLowerCase() || "";
      case "status":
        return entry.status?.toLowerCase() || "";
      case "my_rating":
        return entry.my_rating || 0;
      case "average_rating":
        return entry.average_rating || 0;
      case "genre":
        // Sort by first genre
        return Array.isArray(entry.genre) && entry.genre.length > 0 ? entry.genre[0].toLowerCase() : "";
      case "platform":
        return entry.platform?.toLowerCase() || "";
      case "medium":
        return entry.medium?.toLowerCase() || "";
      case "season":
        return entry.season || "";
      case "episodes":
        return entry.episodes || 0;
      case "length":
        // Sort by string value for now, could be improved to parse specific formats if needed
        return entry.length || "";
      case "language":
        // Sort by first language
        return Array.isArray(entry.language) && entry.language.length > 0 ? entry.language[0].toLowerCase() : "";
      case "price":
        return entry.price || 0;
      case "time_taken":
        return getTimeTaken(entry.time_taken, entry.start_date, entry.finish_date);
      case "imdb_id":
        return entry.imdb_id?.toLowerCase() || "";
      case "start_date":
        return entry.start_date ? new Date(entry.start_date).getTime() : 0;
      case "finish_date":
        return entry.finish_date ? new Date(entry.finish_date).getTime() : 0;
      default:
        return "";
    }
  };

  const {
    sortedEntries,
    sortColumn,
    sortDirection,
    handleSort
  } = useSortedEntries({
    entries,
    getValueForColumn,
    defaultSort: { column: null, direction: null }
  });

  const getSortIcon = (column: ColumnKey) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  };
  // Initialize with defaults - will be loaded from Supabase in useEffect
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    const defaultVisible = new Set<ColumnKey>();
    Object.entries(COLUMN_DEFINITIONS).forEach(([key, def]) => {
      if (def.defaultVisible) {
        defaultVisible.add(key as ColumnKey);
      }
    });
    return defaultVisible;
  });
  const [columnsLoaded, setColumnsLoaded] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);

  // Batch metadata fetch hook
  const { fetching, fetchProgress, fetchMetadataForEntries } = useBatchMetadataFetch({
    onComplete: () => {
      onRefresh?.();
      setSelectedEntries(new Set());
    }
  });

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<MediaEntry | null>(null);

  // Load column visibility from Supabase
  useEffect(() => {
    async function loadColumns() {
      const saved = await getUserPreference<string[]>("media-table-visible-columns");
      if (saved && Array.isArray(saved)) {
        // Filter to only include valid ColumnKey values
        const validColumns = saved.filter((key): key is ColumnKey =>
          key in COLUMN_DEFINITIONS
        );
        setVisibleColumns(new Set(validColumns));
      }
      setColumnsLoaded(true);
    }
    loadColumns();
  }, []);

  // Save column visibility to Supabase
  useEffect(() => {
    if (!columnsLoaded) return; // Don't save until we've loaded initial state

    async function saveColumns() {
      await setUserPreference("media-table-visible-columns", Array.from(visibleColumns));
    }
    saveColumns();
  }, [visibleColumns, columnsLoaded]);

  // Listen for custom events to sync column visibility between components
  useEffect(() => {
    const handleColumnChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setVisibleColumns(new Set(customEvent.detail));
      }
    };
    window.addEventListener("media-table-columns-changed", handleColumnChange);
    return () => {
      window.removeEventListener("media-table-columns-changed", handleColumnChange);
    };
  }, []);

  // Clear selection when exiting select mode
  useEffect(() => {
    if (!showSelectMode) {
      setSelectedEntries(new Set());
    }
  }, [showSelectMode]);





  async function batchFetchMetadata() {
    if (selectedEntries.size === 0) {
      toast.error("Please select entries to fetch");
      return;
    }
    const entriesToFetch = sortedEntries.filter(e => selectedEntries.has(e.id));
    await fetchMetadataForEntries(entriesToFetch);
  }

  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  const visibleColumnCount = visibleColumns.size;
  const totalColumnCount = Object.keys(COLUMN_DEFINITIONS).length;

  const allSelected = sortedEntries.length > 0 && selectedEntries.size === sortedEntries.length;
  const someSelected = selectedEntries.size > 0 && selectedEntries.size < sortedEntries.length;

  // Get selected entries for batch edit dialog
  const selectedEntriesArray = useMemo(() =>
    sortedEntries.filter(e => selectedEntries.has(e.id)),
    [sortedEntries, selectedEntries]
  );

  const handleBatchEditSuccess = () => {
    setSelectedEntries(new Set());
    onRefresh?.();
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(sortedEntries.map(e => e.id)));
    }
  };

  const toggleSelectEntry = (id: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar - only show when select mode is active */}
      {showSelectMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={batchFetchMetadata}
              disabled={fetching || selectedEntries.size === 0 || entries.length === 0}
            >
              {fetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching {fetchProgress.current}/{fetchProgress.total}...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Batch Fetch {selectedEntries.size > 0 ? `(${selectedEntries.size})` : ""}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchEditOpen(true)}
              disabled={selectedEntries.size === 0}
            >
              <Edit className="mr-2 h-4 w-4" />
              Batch Edit {selectedEntries.size > 0 ? `(${selectedEntries.size})` : ""}
            </Button>
            {selectedEntries.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEntries(new Set())}
              >
                Clear Selection
              </Button>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => onSelectModeChange?.(false)}
          >
            Done
          </Button>
        </div>
      )}

      {/* Mobile Card View - visible on small screens */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {sortedEntries.map((entry) => (
          <Card
            key={entry.id}
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${showSelectMode && selectedEntries.has(entry.id) ? "ring-2 ring-primary" : ""}`}
            onClick={() => {
              if (showSelectMode) {
                toggleSelectEntry(entry.id);
              } else {
                setSelectedEntryForDetails(entry);
                setDetailsDialogOpen(true);
              }
            }}
          >
            <CardContent className="p-3">
              <div className="flex gap-3">
                {/* Poster */}
                <div className="w-14 h-20 relative bg-muted rounded flex-shrink-0 overflow-hidden">
                  <SafeImage
                    src={entry.poster_url || ""}
                    alt={entry.title}
                    fill
                    className="object-cover"
                    fallbackElement={
                      <span className="text-xl flex items-center justify-center h-full">
                        {getPlaceholderPoster(entry.type)}
                      </span>
                    }
                  />
                  {showSelectMode && selectedEntries.has(entry.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <CheckSquare className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">{entry.title}</h3>
                  <div className="mt-1">
                    {(() => {
                      const variants = {
                        "Finished": "default",
                        "Watching": "secondary",
                        "On Hold": "outline",
                        "Dropped": "destructive",
                        "Plan to Watch": "outline",
                      } as const;
                      return (
                        <Badge
                          variant={variants[entry.status as keyof typeof variants] || "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {entry.status || "N/A"}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="mt-auto pt-1 flex items-center justify-between">
                    {entry.my_rating ? (
                      <span className="text-xs font-medium">★ {entry.my_rating}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {entry.medium && (
                      <span className="text-[10px] text-muted-foreground">{entry.medium}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sortedEntries.length === 0 && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No entries found. Add your first media entry!
          </div>
        )}
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="rounded-md border overflow-x-auto hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelectMode && (
                <TableHead className="w-[50px]">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center"
                    title={allSelected ? "Deselect all" : "Select all"}
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : someSelected ? (
                      <div className="h-4 w-4 border-2 border-foreground rounded" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("poster") && (
                <TableHead className="w-[80px]">Poster</TableHead>
              )}
              {visibleColumns.has("title") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("title")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Title
                    {getSortIcon("title")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("type") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("type")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Type
                    {getSortIcon("type")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("status") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Status
                    {getSortIcon("status")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("my_rating") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("my_rating")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    My Rating
                    {getSortIcon("my_rating")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("average_rating") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("average_rating")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Average Rating
                    {getSortIcon("average_rating")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("genre") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("genre")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Genre
                    {getSortIcon("genre")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("platform") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("platform")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Platform
                    {getSortIcon("platform")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("medium") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("medium")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Medium
                    {getSortIcon("medium")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("season") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("season")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Season
                    {getSortIcon("season")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("episodes") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("episodes")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Episodes
                    {getSortIcon("episodes")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("length") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("length")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Length
                    {getSortIcon("length")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("language") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("language")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Language
                    {getSortIcon("language")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("price") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("price")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Price
                    {getSortIcon("price")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("time_taken") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("time_taken")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Time Taken
                    {getSortIcon("time_taken")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("imdb_id") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("imdb_id")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    IMDb ID
                    {getSortIcon("imdb_id")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("start_date") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("start_date")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Start Date
                    {getSortIcon("start_date")}
                  </button>
                </TableHead>
              )}
              {visibleColumns.has("finish_date") && (
                <TableHead>
                  <button
                    onClick={() => handleSort("finish_date")}
                    className="flex items-center hover:text-foreground transition-colors cursor-pointer"
                  >
                    Finish Date
                    {getSortIcon("finish_date")}
                  </button>
                </TableHead>
              )}

            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount + (showSelectMode ? 2 : 1)} className="text-center py-8 text-muted-foreground">
                  No entries found. Add your first media entry!
                </TableCell>
              </TableRow>
            ) : (
              sortedEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={`cursor-pointer hover:bg-muted/50 ${showSelectMode && selectedEntries.has(entry.id) ? "bg-muted/50" : ""}`}
                  onClick={() => {
                    setSelectedEntryForDetails(entry);
                    setDetailsDialogOpen(true);
                  }}
                >
                  {showSelectMode && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelectEntry(entry.id)}
                        className="flex items-center justify-center"
                        title={selectedEntries.has(entry.id) ? "Deselect" : "Select"}
                      >
                        {selectedEntries.has(entry.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                  )}
                  {visibleColumns.has("poster") && (
                    <TableCell className="py-3">
                      <div className="w-12 h-16 relative bg-muted rounded flex items-center justify-center overflow-hidden">
                        <SafeImage
                          src={entry.poster_url || ""}
                          alt={entry.title}
                          fill
                          className="object-cover"
                          fallbackElement={
                            <span className="text-2xl">
                              {getPlaceholderPoster(entry.type)}
                            </span>
                          }
                        />
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has("title") && (
                    <TableCell className="font-medium py-3">
                      {entry.title}
                    </TableCell>
                  )}
                  {visibleColumns.has("type") && (
                    <TableCell className="py-3">
                      <Badge variant="outline">{entry.type || "N/A"}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.has("status") && (
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const variants = {
                            "Finished": "default",
                            "Watching": "secondary",
                            "On Hold": "outline",
                            "Dropped": "destructive",
                            "Plan to Watch": "outline",
                          } as const;

                          return (
                            <Badge variant={variants[entry.status as keyof typeof variants] || "outline"} className="whitespace-nowrap">
                              {entry.status || "N/A"}
                            </Badge>
                          );
                        })()}
                        {(entry.status === "Dropped" || entry.status === "On Hold") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const result = await restartEntry(entry.id);
                              if (result.success) {
                                toast.success("Item restarted successfully");
                                onRefresh?.();
                              } else {
                                toast.error(result.error || "Failed to restart item");
                              }
                            }}
                            title="Restart this item"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has("my_rating") && (
                    <TableCell className="py-3">
                      {entry.my_rating ? (
                        <div className="font-medium">
                          ★ {entry.my_rating % 1 === 0 ? entry.my_rating : entry.my_rating.toFixed(1)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.has("average_rating") && (
                    <TableCell className="py-3">
                      {entry.average_rating ? (
                        <div className="font-medium text-sm">
                          ★ {entry.average_rating % 1 === 0 ? entry.average_rating : entry.average_rating.toFixed(1)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.has("genre") && (
                    <TableCell className="text-sm py-3">
                      {entry.genre && Array.isArray(entry.genre)
                        ? entry.genre.join(", ")
                        : entry.genre || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("platform") && (
                    <TableCell className="text-sm py-3">
                      {entry.platform || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("medium") && (
                    <TableCell className="text-sm py-3">
                      {entry.medium || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("season") && (
                    <TableCell className="text-sm py-3">
                      {entry.season || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("episodes") && (
                    <TableCell className="text-sm py-3">
                      {entry.episodes || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("length") && (
                    <TableCell className="text-sm py-3">
                      {formatLength(entry.length) || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("language") && (
                    <TableCell className="text-sm py-3">
                      {formatLanguageForDisplay(entry.language)}
                    </TableCell>
                  )}
                  {visibleColumns.has("price") && (
                    <TableCell className="text-sm py-3">
                      {entry.price ? `$${entry.price.toFixed(2)}` : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("time_taken") && (
                    <TableCell className="text-sm py-3">
                      {getTimeTaken(entry.time_taken, entry.start_date, entry.finish_date) || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("imdb_id") && (
                    <TableCell className="text-sm font-mono py-3">
                      {entry.imdb_id || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("start_date") && (
                    <TableCell className="text-sm py-3">
                      {formatDate(entry.start_date)}
                    </TableCell>
                  )}
                  {visibleColumns.has("finish_date") && (
                    <TableCell className="text-sm py-3">
                      {formatDate(entry.finish_date)}
                    </TableCell>
                  )}

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Batch Edit Dialog */}
      <BatchEditDialog
        open={batchEditOpen}
        onOpenChange={setBatchEditOpen}
        selectedEntries={selectedEntriesArray}
        onSuccess={handleBatchEditSuccess}
      />

      {/* Media Details Dialog */}
      <MediaDetailsDialog
        entry={selectedEntryForDetails}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onSuccess={(updated) => {
          onEntryUpdate?.(updated);
          // If we need to refresh the list locally instead of full parent refresh, we rely on onEntryUpdate
        }}
        onDelete={onDelete}
      />
    </div>
  );
}
