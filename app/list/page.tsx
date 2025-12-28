"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MediaEntry } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { MediaTable } from "@/components/media-table";
import { MediaCardGrid } from "@/components/media-card-grid";
import { Filters } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, LayoutList, CheckSquare } from "lucide-react";
import { toast } from "sonner";

function ListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showSelectMode, setShowSelectMode] = useState(false);
  const isInitialized = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromState = useRef(false);

  // Filter states - initialize from URL params
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [medium, setMedium] = useState("all");
  const [genre, setGenre] = useState("all");

  // Initialize filters from URL params on mount
  useEffect(() => {
    // Don't sync back if we're the ones updating the URL
    if (isUpdatingFromState.current) {
      isUpdatingFromState.current = false;
      return;
    }

    const searchParam = searchParams.get("search") || "";
    const typeParam = searchParams.get("type") || "all";
    const statusParam = searchParams.get("status") || "all";
    const platformParam = searchParams.get("platform") || "all";
    const mediumParam = searchParams.get("medium") || "all";
    const genreParam = searchParams.get("genre") || "all";

    setSearch(searchParam);
    setType(typeParam);
    setStatus(statusParam);
    setPlatform(platformParam);
    setMedium(mediumParam);
    setGenre(genreParam);
    isInitialized.current = true;
  }, [searchParams]);

  // Update URL params when filters change (but not on initial load)
  // Separate effect for non-search filters (immediate update)
  useEffect(() => {
    if (!isInitialized.current) return;

    const params = new URLSearchParams();

    // Include current search from URL, but don't trigger on search changes
    const currentSearch = searchParams.get("search") || "";
    if (currentSearch) params.set("search", currentSearch);
    if (type !== "all") params.set("type", type);
    if (status !== "all") params.set("status", status);
    if (platform !== "all") params.set("platform", platform);
    if (medium !== "all") params.set("medium", medium);
    if (genre !== "all") params.set("genre", genre);

    const newUrl = params.toString() ? `/list?${params.toString()}` : "/list";
    isUpdatingFromState.current = true;
    router.replace(newUrl, { scroll: false });
  }, [type, status, platform, medium, genre, router, searchParams]);

  // Debounce URL updates for search query to prevent page refresh on every keystroke
  useEffect(() => {
    if (!isInitialized.current) return;

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout to update URL after user stops typing
    // Capture current filter values in closure
    const currentSearch = search;
    const currentType = type;
    const currentStatus = status;
    const currentPlatform = platform;
    const currentMedium = medium;
    const currentGenre = genre;

    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();

      if (currentSearch) params.set("search", currentSearch);
      if (currentType !== "all") params.set("type", currentType);
      if (currentStatus !== "all") params.set("status", currentStatus);
      if (currentPlatform !== "all") params.set("platform", currentPlatform);
      if (currentMedium !== "all") params.set("medium", currentMedium);
      if (currentGenre !== "all") params.set("genre", currentGenre);

      const newUrl = params.toString() ? `/list?${params.toString()}` : "/list";
      isUpdatingFromState.current = true;
      router.replace(newUrl, { scroll: false });
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]); // Only trigger on search changes, but capture other filter values

  // Fetch entries
  useEffect(() => {
    fetchEntries();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = entries;

    if (search) {
      filtered = filtered.filter((entry) =>
        entry.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (type !== "all") {
      filtered = filtered.filter((entry) => entry.type === type);
    }

    if (status !== "all") {
      filtered = filtered.filter((entry) => entry.status === status);
    }

    if (platform !== "all") {
      filtered = filtered.filter((entry) => entry.platform === platform);
    }

    if (medium !== "all") {
      filtered = filtered.filter((entry) => entry.medium === medium);
    }

    if (genre !== "all") {
      filtered = filtered.filter((entry) => {
        if (!entry.genre) return false;
        const genres = Array.isArray(entry.genre) ? entry.genre : [entry.genre];
        return genres.some(g => g.toLowerCase() === genre.toLowerCase());
      });
    }

    setFilteredEntries(filtered);
  }, [entries, search, type, status, platform, medium, genre]);

  async function fetchEntries() {
    try {
      const { data, error } = await supabase
        .from("media_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const { error } = await supabase
        .from("media_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Entry deleted successfully");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    }
  }

  function handleEdit(entry: MediaEntry) {
    router.push(`/add?id=${entry.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">All Media</h1>
            <p className="text-muted-foreground mt-2">
              {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
              {search || type !== "all" || status !== "all" || platform !== "all" || medium !== "all"
                ? ` (filtered from ${entries.length})`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === "table" && (
              <Button
                variant={showSelectMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowSelectMode(!showSelectMode);
                  if (showSelectMode) {
                    // Clear selection when exiting select mode
                  }
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select
              </Button>
            )}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => router.push("/add")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        <Filters
          search={search}
          type={type}
          status={status}
          platform={platform}
          medium={medium}
          genre={genre}
          genres={useMemo(() => {
            const genreSet = new Set<string>();
            entries.forEach(entry => {
              if (entry.genre && Array.isArray(entry.genre)) {
                entry.genre.forEach(g => {
                  if (g && g.trim()) genreSet.add(g.trim());
                });
              }
            });
            return Array.from(genreSet).sort();
          }, [entries])}
          onSearchChange={setSearch}
          onTypeChange={setType}
          onStatusChange={setStatus}
          onPlatformChange={setPlatform}
          onMediumChange={setMedium}
          onGenreChange={setGenre}
        />

        {viewMode === "table" ? (
          <MediaTable
            entries={filteredEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={fetchEntries}
            showSelectMode={showSelectMode}
            onSelectModeChange={setShowSelectMode}
            onEntryUpdate={(updatedEntry) => {
              // Update the entry in the entries array without full reload
              // This preserves all table state (sort, filters, pagination, scroll position)
              setEntries(prev => 
                prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
              )
              // Note: No refresh is triggered, so filters, sort, and pagination state are preserved
            }}
          />
        ) : (
          <MediaCardGrid
            entries={filteredEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </main>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <p className="text-sm font-mono">Loading...</p>
        </div>
      </div>
    }>
      <ListPageContent />
    </Suspense>
  );
}

