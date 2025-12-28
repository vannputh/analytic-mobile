"use client";

import { useState, useMemo, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { MediaEntry } from "@/lib/database.types";
import { getPlaceholderPoster, formatDate } from "@/lib/types";
import { formatLength } from "@/lib/parsing-utils";
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
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Loader2, CheckSquare, Square, Edit, History, RotateCcw } from "lucide-react";
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
import { StatusHistoryDialog } from "@/components/status-history-dialog";
import { EditEntryDialog } from "@/components/edit-entry-dialog";
import { restartEntry } from "@/lib/actions";
import { getUserPreference, setUserPreference } from "@/lib/user-preferences";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
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
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchEditData, setBatchEditData] = useState({
    type: "",
    status: "",
    medium: "",
    price: "",
    language: "",
    episodes: "",
    genre: "",
  });
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEntryForHistory, setSelectedEntryForHistory] = useState<MediaEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState<MediaEntry | null>(null);

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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Finished":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "In Progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "On Hold":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Dropped":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Plan to Watch":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "";
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedEntries = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return entries;
    }

    return [...entries].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "type":
          aValue = a.type?.toLowerCase() || "";
          bValue = b.type?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "my_rating":
          aValue = a.my_rating ?? 0;
          bValue = b.my_rating ?? 0;
          break;
        case "average_rating":
          aValue = a.average_rating ?? 0;
          bValue = b.average_rating ?? 0;
          break;
        case "genre":
          aValue = Array.isArray(a.genre) ? a.genre.join(", ").toLowerCase() : "";
          bValue = Array.isArray(b.genre) ? b.genre.join(", ").toLowerCase() : "";
          break;
        case "platform":
          aValue = a.platform?.toLowerCase() || "";
          bValue = b.platform?.toLowerCase() || "";
          break;
        case "medium":
          aValue = a.medium?.toLowerCase() || "";
          bValue = b.medium?.toLowerCase() || "";
          break;
        case "season":
          aValue = a.season?.toLowerCase() || "";
          bValue = b.season?.toLowerCase() || "";
          break;
        case "episodes":
          aValue = a.episodes ?? 0;
          bValue = b.episodes ?? 0;
          break;
        case "length":
          aValue = a.length?.toLowerCase() || "";
          bValue = b.length?.toLowerCase() || "";
          break;
        case "language":
          aValue = Array.isArray(a.language) ? a.language.join(", ").toLowerCase() : "";
          bValue = Array.isArray(b.language) ? b.language.join(", ").toLowerCase() : "";
          break;
        case "price":
          aValue = a.price ?? 0;
          bValue = b.price ?? 0;
          break;
        case "time_taken":
          aValue = a.time_taken?.toLowerCase() || "";
          bValue = b.time_taken?.toLowerCase() || "";
          break;
        case "imdb_id":
          aValue = a.imdb_id?.toLowerCase() || "";
          bValue = b.imdb_id?.toLowerCase() || "";
          break;
        case "start_date":
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case "finish_date":
          aValue = a.finish_date ? new Date(a.finish_date).getTime() : 0;
          bValue = b.finish_date ? new Date(b.finish_date).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [entries, sortColumn, sortDirection]);

  const getSortIcon = (column: SortColumn) => {
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

  async function batchFetchMetadata() {
    if (selectedEntries.size === 0) {
      toast.error("Please select entries to fetch");
      return;
    }

    const entriesToFetch = sortedEntries.filter(e => selectedEntries.has(e.id));

    if (entriesToFetch.length === 0) {
      toast.error("No entries selected");
      return;
    }

    setFetching(true);
    setFetchProgress({ current: 0, total: entriesToFetch.length });

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < entriesToFetch.length; i++) {
        const entry = entriesToFetch[i];

        if (!entry.title?.trim()) {
          setFetchProgress({ current: i + 1, total: entriesToFetch.length });
          continue;
        }

        try {
          let url = `/api/metadata?title=${encodeURIComponent(entry.title.trim())}`;
          
          // Pass medium parameter for books (Google Books API)
          if (entry.medium === "Book") {
            url += `&medium=${encodeURIComponent(entry.medium)}`;
          } else if (entry.medium) {
            // Map medium values to OMDB type for movies and TV shows
            const typeMap: Record<string, string> = {
              "Movie": "movie",
              "TV Show": "series",
            };
            const omdbType = typeMap[entry.medium];
            if (omdbType) {
              url += `&type=${omdbType}`;
            }
          }
          
          if (entry.season) {
            url += `&season=${encodeURIComponent(entry.season)}`;
          }

          const response = await fetch(url);

          if (response.ok) {
            const meta = await response.json();

            // Update entry in database (don't update type or medium)
            const updateData: any = {};
            // Note: type and medium are NOT updated to preserve user's categorization
            if (meta.genre && !entry.genre) {
              updateData.genre = Array.isArray(meta.genre) ? meta.genre : meta.genre.split(",").map((g: string) => g.trim()).filter(Boolean);
            }
            if (meta.language && !entry.language) {
              updateData.language = Array.isArray(meta.language) ? meta.language : meta.language.split(",").map((l: string) => l.trim()).filter(Boolean);
            }
            if (meta.average_rating && !entry.average_rating) updateData.average_rating = meta.average_rating;
            if (meta.length && !entry.length) updateData.length = meta.length;
            if (meta.episodes && !entry.episodes) updateData.episodes = meta.episodes;
            if (meta.poster_url && !entry.poster_url) updateData.poster_url = meta.poster_url;
            if (meta.season && !entry.season) updateData.season = meta.season;
            if (meta.imdb_id && !entry.imdb_id) updateData.imdb_id = meta.imdb_id;

            if (Object.keys(updateData).length > 0) {
              const { error } = await supabase
                .from("media_entries")
                .update(updateData)
                .eq("id", entry.id);

              if (error) throw error;
              successCount++;
            }
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`Failed to fetch metadata for "${entry.title}":`, err);
          failedCount++;
        }

        setFetchProgress({ current: i + 1, total: entriesToFetch.length });

        if (i < entriesToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (successCount > 0) {
        toast.success(`Fetched metadata for ${successCount} items${failedCount > 0 ? `, ${failedCount} failed` : ""}`);
        onRefresh?.();
        setSelectedEntries(new Set());
      } else if (failedCount > 0) {
        toast.error(`Failed to fetch metadata for ${failedCount} items`);
      }
    } catch (error) {
      console.error("Batch fetch error:", error);
      toast.error("Failed to batch fetch metadata");
    } finally {
      setFetching(false);
      setFetchProgress({ current: 0, total: 0 });
    }
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
  const totalColumnCount = Object.keys(COLUMN_DEFINITIONS).length + 1; // +1 for Actions

  const allSelected = sortedEntries.length > 0 && selectedEntries.size === sortedEntries.length;
  const someSelected = selectedEntries.size > 0 && selectedEntries.size < sortedEntries.length;

  async function batchEdit() {
    if (selectedEntries.size === 0) {
      toast.error("Please select entries to edit");
      return;
    }

    const entriesToEdit = sortedEntries.filter(e => selectedEntries.has(e.id));
    const updateData: Partial<MediaEntry> = {};
    if (batchEditData.type && batchEditData.type !== "no-change") updateData.type = batchEditData.type;
    if (batchEditData.status && batchEditData.status !== "no-change") updateData.status = batchEditData.status;
    if (batchEditData.medium && batchEditData.medium !== "no-change") updateData.medium = batchEditData.medium;
    
    // Handle price: empty string means keep current, any value means update
    if (batchEditData.price !== "" && batchEditData.price !== "no-change") {
      const priceValue = parseFloat(batchEditData.price);
      if (!isNaN(priceValue) && priceValue >= 0) {
        updateData.price = priceValue;
      }
    }
    
    // Handle language: parse comma-separated languages (like genre)
    if (batchEditData.language !== "" && batchEditData.language !== "no-change") {
      const languages = batchEditData.language
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      updateData.language = languages.length > 0 ? languages : null;
    }
    
    // Handle episodes: empty string means keep current, any value means update
    if (batchEditData.episodes !== "" && batchEditData.episodes !== "no-change") {
      const episodesValue = parseInt(batchEditData.episodes);
      if (!isNaN(episodesValue) && episodesValue >= 0) {
        updateData.episodes = episodesValue;
      }
    }

    // Handle genre: parse comma-separated genres and merge with existing
    let genresToAdd: string[] = [];
    if (batchEditData.genre && batchEditData.genre.trim() !== "") {
      genresToAdd = batchEditData.genre
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0);
    }

    // If we have genres to add, we need to update each entry individually to merge genres
    const hasGenreUpdate = genresToAdd.length > 0;
    const hasOtherUpdates = Object.keys(updateData).length > 0;

    if (!hasGenreUpdate && !hasOtherUpdates) {
      toast.error("Please select at least one field to update");
      return;
    }

    setIsBatchEditing(true);
    try {
      if (hasGenreUpdate) {
        // Update each entry individually to merge genres
        let successCount = 0;
        let failedCount = 0;

        for (const entry of entriesToEdit) {
          try {
            // Preserve original case of existing genres
            const currentGenres = Array.isArray(entry.genre) 
              ? entry.genre.map((g) => g.trim()).filter((g) => g.length > 0)
              : [];

            // Create a map of lowercase -> original case for existing genres
            const existingGenreMap = new Map<string, string>();
            currentGenres.forEach((g) => {
              existingGenreMap.set(g.toLowerCase(), g);
            });

            // Add new genres, checking for duplicates (case-insensitive)
            const mergedGenres = [...currentGenres];
            genresToAdd.forEach((newGenre) => {
              const normalized = newGenre.toLowerCase();
              if (!existingGenreMap.has(normalized)) {
                mergedGenres.push(newGenre);
                existingGenreMap.set(normalized, newGenre);
              }
            });

            const entryUpdateData: Partial<MediaEntry> = { ...updateData, genre: mergedGenres };

            const { error } = await supabase
              .from("media_entries")
              .update(entryUpdateData)
              .eq("id", entry.id);

            if (error) throw error;
            successCount++;
          } catch (err) {
            console.error(`Failed to update entry ${entry.id}:`, err);
            failedCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Updated ${successCount} entries${failedCount > 0 ? `, ${failedCount} failed` : ""}`);
        }
        if (failedCount > 0 && successCount === 0) {
          toast.error(`Failed to update ${failedCount} entries`);
        }
      } else {
        // No genre update, use batch update for other fields
        const { error } = await supabase
          .from("media_entries")
          .update(updateData)
          .in("id", Array.from(selectedEntries));

        if (error) throw error;

        toast.success(`Updated ${selectedEntries.size} entries`);
      }

      // Reset state and close dialog
      setBatchEditData({ type: "", status: "", medium: "", price: "", language: "", episodes: "", genre: "" });
      setSelectedEntries(new Set());
      onRefresh?.();
      
      // Close dialog after a brief delay to ensure state updates
      setTimeout(() => {
        setBatchEditOpen(false);
        setIsBatchEditing(false);
      }, 100);
    } catch (error) {
      console.error("Batch edit error:", error);
      toast.error("Failed to update entries");
      setIsBatchEditing(false);
    }
  }

  const handleBatchEditDialogChange = (open: boolean) => {
    if (!isBatchEditing) {
      setBatchEditOpen(open);
      if (!open) {
        // Reset form when closing
        setBatchEditData({ type: "", status: "", medium: "", price: "", language: "", episodes: "", genre: "" });
      }
    }
  }

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

      <div className="rounded-md border overflow-x-auto">
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
              <TableHead className="w-[80px]">Actions</TableHead>
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
                  className={showSelectMode && selectedEntries.has(entry.id) ? "bg-muted/50" : ""}
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
                    <TableCell>
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
                    <TableCell className="font-medium">
                      {entry.title}
                    </TableCell>
                  )}
                  {visibleColumns.has("type") && (
                    <TableCell>
                      <Badge variant="outline">{entry.type || "N/A"}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.has("status") && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status || "N/A"}
                        </Badge>
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
                    <TableCell>
                      {entry.my_rating ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{entry.my_rating}</span>
                          <span className="text-muted-foreground text-sm">/10</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.has("average_rating") && (
                    <TableCell>
                      {entry.average_rating ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{entry.average_rating}</span>
                          <span className="text-muted-foreground text-sm">/10</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.has("genre") && (
                    <TableCell className="text-sm">
                      {entry.genre && Array.isArray(entry.genre)
                        ? entry.genre.join(", ")
                        : entry.genre || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("platform") && (
                    <TableCell className="text-sm">
                      {entry.platform || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("medium") && (
                    <TableCell className="text-sm">
                      {entry.medium || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("season") && (
                    <TableCell className="text-sm">
                      {entry.season || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("episodes") && (
                    <TableCell className="text-sm">
                      {entry.episodes || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("length") && (
                    <TableCell className="text-sm">
                      {formatLength(entry.length) || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("language") && (
                    <TableCell className="text-sm">
                      {entry.language && Array.isArray(entry.language)
                        ? entry.language.join(", ")
                        : (typeof entry.language === 'string' && entry.language) ? entry.language : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("price") && (
                    <TableCell className="text-sm">
                      {entry.price ? `$${entry.price.toFixed(2)}` : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("time_taken") && (
                    <TableCell className="text-sm">
                      {entry.time_taken || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("imdb_id") && (
                    <TableCell className="text-sm font-mono">
                      {entry.imdb_id || <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("start_date") && (
                    <TableCell className="text-sm">
                      {formatDate(entry.start_date)}
                    </TableCell>
                  )}
                  {visibleColumns.has("finish_date") && (
                    <TableCell className="text-sm">
                      {formatDate(entry.finish_date)}
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // Enable select mode and select the entry immediately
                            if (onSelectModeChange) {
                              onSelectModeChange(true);
                            }
                            setSelectedEntries(prev => {
                              const next = new Set(prev);
                              next.add(entry.id);
                              return next;
                            });
                          }}
                          className="cursor-pointer"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Select
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntryForEdit(entry);
                            setEditDialogOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntryForHistory(entry);
                            setHistoryDialogOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(entry.id)}
                          className="cursor-pointer text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Batch Edit Dialog */}
      <Dialog open={batchEditOpen} onOpenChange={handleBatchEditDialogChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl">Batch Edit {selectedEntries.size} Entries</DialogTitle>
            <DialogDescription>
              Update the selected fields for all selected entries. Leave fields empty or select "Keep current" to preserve existing values.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            <div className="space-y-6 py-4">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-type">Type</Label>
                      <Select 
                        value={batchEditData.type} 
                        onValueChange={(value) => setBatchEditData(prev => ({ ...prev, type: value }))}
                        disabled={isBatchEditing}
                      >
                        <SelectTrigger id="batch-type">
                          <SelectValue placeholder="Keep current" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-change">Keep current</SelectItem>
                          {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-status">Status</Label>
                      <Select 
                        value={batchEditData.status} 
                        onValueChange={(value) => setBatchEditData(prev => ({ ...prev, status: value }))}
                        disabled={isBatchEditing}
                      >
                        <SelectTrigger id="batch-status">
                          <SelectValue placeholder="Keep current" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-change">Keep current</SelectItem>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-medium">Medium</Label>
                      <Select 
                        value={batchEditData.medium} 
                        onValueChange={(value) => setBatchEditData(prev => ({ ...prev, medium: value }))}
                        disabled={isBatchEditing}
                      >
                        <SelectTrigger id="batch-medium">
                          <SelectValue placeholder="Keep current" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-change">Keep current</SelectItem>
                          {MEDIUM_OPTIONS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Details Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-price">Price</Label>
                      <Input
                        id="batch-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Keep current (leave empty)"
                        value={batchEditData.price}
                        onChange={(e) => setBatchEditData(prev => ({ ...prev, price: e.target.value }))}
                        disabled={isBatchEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch-episodes">Number of Episodes</Label>
                      <Input
                        id="batch-episodes"
                        type="number"
                        min="0"
                        placeholder="Keep current (leave empty)"
                        value={batchEditData.episodes}
                        onChange={(e) => setBatchEditData(prev => ({ ...prev, episodes: e.target.value }))}
                        disabled={isBatchEditing}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="batch-language">Language</Label>
                      <Input
                        id="batch-language"
                        type="text"
                        placeholder="Comma-separated (e.g., English, Spanish) - leave empty to keep current"
                        value={batchEditData.language}
                        onChange={(e) => setBatchEditData(prev => ({ ...prev, language: e.target.value }))}
                        disabled={isBatchEditing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate multiple languages with commas
                      </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="batch-genre">Genre</Label>
                      <Input
                        id="batch-genre"
                        type="text"
                        placeholder="Comma-separated (e.g., Action, Drama) - leave empty to keep current"
                        value={batchEditData.genre}
                        onChange={(e) => setBatchEditData(prev => ({ ...prev, genre: e.target.value }))}
                        disabled={isBatchEditing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Genres will be added to existing genres, not replaced
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => handleBatchEditDialogChange(false)}
              disabled={isBatchEditing}
            >
              Cancel
            </Button>
            <Button 
              onClick={batchEdit}
              disabled={isBatchEditing}
            >
              {isBatchEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedEntries.size} Entries`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedEntryForHistory && (
        <StatusHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          mediaEntryId={selectedEntryForHistory.id}
          mediaTitle={selectedEntryForHistory.title}
          currentStatus={selectedEntryForHistory.status}
          onRestart={() => {
            onRefresh?.();
            setHistoryDialogOpen(false);
          }}
        />
      )}

      <EditEntryDialog
        entry={selectedEntryForEdit}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedEntryForEdit(null);
          }
        }}
        onSuccess={(updatedEntry) => {
          // Update the entry in place without full refresh
          onEntryUpdate?.(updatedEntry);
        }}
      />
    </div>
  );
}
