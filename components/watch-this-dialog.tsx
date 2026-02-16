"use client";

import { useState, useEffect } from "react";
import { MediaEntry } from "@/lib/database.types";
import { SafeImage } from "@/components/ui/safe-image";
import { getPlaceholderPoster } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Film, Tv, BookOpen } from "lucide-react";

interface WatchThisDialogProps {
  entry: MediaEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user clicks "Open in diary" to open the edit dialog. */
  onOpenInDiary?: (entry: MediaEntry) => void;
}

function isFilmOrShow(medium: string | null, type: string | null): "film" | "show" | "other" {
  const m = (medium ?? type ?? "").toLowerCase();
  if (m.includes("movie") || m.includes("film")) return "film";
  if (m.includes("tv") || m.includes("show") || m.includes("series")) return "show";
  return "other";
}

export function WatchThisDialog({
  entry,
  open,
  onOpenChange,
  onOpenInDiary,
}: WatchThisDialogProps) {
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entry) {
      setSynopsis(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchSynopsis = async () => {
      try {
        const params = new URLSearchParams();
        params.set("source", "tmdb");
        if (entry.imdb_id?.trim().startsWith("tt")) {
          params.set("imdb_id", entry.imdb_id.trim());
        }
        if (entry.title?.trim()) {
          params.set("title", entry.title.trim());
        }
        const medium = entry.medium ?? entry.type ?? "";
        if (medium.toLowerCase().includes("tv") || medium.toLowerCase().includes("show") || medium.toLowerCase().includes("series")) {
          params.set("type", "series");
        } else if (medium.toLowerCase().includes("movie") || medium.toLowerCase().includes("film")) {
          params.set("type", "movie");
        }
        if (entry.season) {
          const match = entry.season.match(/\d+/);
          if (match) params.set("season", match[0]);
        }

        const url = `/api/metadata?${params.toString()}`;
        const res = await fetch(url);
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Could not load synopsis");
          setSynopsis(null);
          return;
        }
        const data = await res.json();
        setSynopsis(data.plot ?? null);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load synopsis");
          setSynopsis(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSynopsis();
    return () => {
      cancelled = true;
    };
  }, [open, entry?.id, entry?.title, entry?.imdb_id, entry?.medium, entry?.type, entry?.season]);

  if (!entry) return null;

  const kind = isFilmOrShow(entry.medium ?? null, entry.type ?? null);
  const watchLabel =
    kind === "film"
      ? "Watch this film"
      : kind === "show"
        ? "Watch this show"
        : "Watch this";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {kind === "film" && <Film className="h-5 w-5 text-primary" />}
            {kind === "show" && <Tv className="h-5 w-5 text-primary" />}
            {kind === "other" && <BookOpen className="h-5 w-5 text-primary" />}
            {watchLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          <div className="w-24 shrink-0 overflow-hidden rounded-md bg-muted">
            <SafeImage
              src={entry.poster_url ?? ""}
              alt={entry.title ?? ""}
              width={96}
              height={144}
              className="h-36 w-24 object-cover"
              fallbackElement={
                <span className="flex h-36 w-24 items-center justify-center text-2xl">
                  {getPlaceholderPoster(entry.type)}
                </span>
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{entry.title ?? "Untitled"}</h3>
            {(entry.medium ?? entry.type) && (
              <p className="text-sm text-muted-foreground">{entry.medium ?? entry.type}</p>
            )}
            <div className="mt-3 text-sm text-muted-foreground">
              {loading && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading synopsis…
                </span>
              )}
              {!loading && error && <p>{error}</p>}
              {!loading && !error && synopsis && <p className="leading-relaxed">{synopsis}</p>}
              {!loading && !error && !synopsis && <p className="italic">No synopsis available.</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          {onOpenInDiary && (
            <Button variant="default" onClick={() => onOpenInDiary(entry)}>
              Open in diary
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
