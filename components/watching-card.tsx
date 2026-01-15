"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MediaEntry, EpisodeWatchRecord } from "@/lib/database.types";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Minus, CalendarIcon, Loader2, Play, Clock } from "lucide-react";
import { format } from "date-fns/format"
import { formatDistanceToNow } from "date-fns/formatDistanceToNow"
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getPlaceholderPoster } from "@/lib/types";

// Dynamic import for dialog component - reduces initial bundle size
const MediaDetailsDialog = dynamic(
    () => import("@/components/media-details-dialog").then(m => m.MediaDetailsDialog),
    { ssr: false }
);

interface WatchingCardProps {
    entry: MediaEntry;
    onUpdate: (updatedEntry: MediaEntry) => void;
}

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

export function WatchingCard({ entry, onUpdate }: WatchingCardProps) {
    const [updating, setUpdating] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Local state for optimistic updates
    const [episodesWatched, setEpisodesWatched] = useState(entry.episodes_watched || 0);
    const [episodeHistory, setEpisodeHistory] = useState<EpisodeWatchRecord[]>(
        parseEpisodeHistory(entry.episode_history)
    );
    const totalEpisodes = entry.episodes || 0;
    const progress = totalEpisodes > 0 ? (episodesWatched / totalEpisodes) * 100 : 0;

    // Date state
    const [lastWatched, setLastWatched] = useState<Date | undefined>(
        entry.last_watched_at ? new Date(entry.last_watched_at) : undefined
    );
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const handleIncrement = async () => {
        if (totalEpisodes > 0 && episodesWatched >= totalEpisodes) return;

        const newEpisodeNumber = episodesWatched + 1;
        const now = new Date();
        const newRecord: EpisodeWatchRecord = {
            episode: newEpisodeNumber,
            watched_at: now.toISOString(),
        };

        await updateProgress(newEpisodeNumber, now, [...episodeHistory, newRecord]);
    };

    const handleDecrement = async () => {
        if (episodesWatched <= 0) return;

        // Remove the last episode from history if it matches
        const newHistory = [...episodeHistory];
        const lastIndex = newHistory.findIndex(h => h.episode === episodesWatched);
        if (lastIndex !== -1) {
            newHistory.splice(lastIndex, 1);
        }

        await updateProgress(episodesWatched - 1, lastWatched, newHistory);
    };

    const handleDateSelect = async (date: Date | undefined) => {
        if (!date) return;
        setIsCalendarOpen(false);
        await updateProgress(episodesWatched, date, episodeHistory);
    };

    const updateProgress = async (
        newCount: number,
        newDate: Date | undefined,
        newHistory: EpisodeWatchRecord[]
    ) => {
        setUpdating(true);
        const previousCount = episodesWatched;
        const previousDate = lastWatched;
        const previousHistory = episodeHistory;

        // Optimistic update
        setEpisodesWatched(newCount);
        if (newDate) setLastWatched(newDate);
        setEpisodeHistory(newHistory);

        try {
            const updates: Record<string, unknown> = {
                episodes_watched: newCount,
                episode_history: newHistory,
            };

            if (newDate) {
                updates.last_watched_at = newDate.toISOString();
            }

            // If we finished the show
            if (totalEpisodes > 0 && newCount >= totalEpisodes) {
                updates.status = "Finished";
                updates.finish_date = new Date().toISOString().split('T')[0];
            }

            const { data, error } = await (supabase
                .from("media_entries" as any) as any)
                .update(updates)
                .eq("id", entry.id)
                .select()
                .single();

            if (error) throw error;

            onUpdate(data);
            toast.success("Progress updated");
        } catch (error) {
            console.error("Error updating progress:", error);
            // Revert optimistic update
            setEpisodesWatched(previousCount);
            setLastWatched(previousDate);
            setEpisodeHistory(previousHistory);
            toast.error("Failed to update progress");
        } finally {
            setUpdating(false);
        }
    };

    // Determine if it's a "fresh" watch (watched today)
    const isWatchedToday = lastWatched && new Date().toDateString() === lastWatched.toDateString();

    // Format last watched for display
    const lastWatchedText = lastWatched
        ? isWatchedToday
            ? "Today"
            : formatDistanceToNow(lastWatched, { addSuffix: true })
        : null;

    // Check if near completion (80%+)
    const isNearCompletion = progress >= 80 && progress < 100;
    const isCompleted = progress >= 100;

    return (
        <>
            <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                {/* Poster Section */}
                <button
                    type="button"
                    className="relative w-full aspect-[4/3] overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
                    onClick={() => setIsDetailsOpen(true)}
                    aria-label={`View details for ${entry.title}`}
                >
                    {/* Poster Image */}
                    {entry.poster_url ? (
                        <SafeImage
                            src={entry.poster_url}
                            alt={entry.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-4xl">
                            {getPlaceholderPoster(entry.type)}
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Floating Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                        <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 hover:bg-black/70">
                            {entry.type || "Media"}
                        </Badge>
                        {entry.season && (
                            <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-white border-0">
                                {entry.season}
                            </Badge>
                        )}
                    </div>

                    {/* Episode Counter Badge */}
                    <div className="absolute top-3 right-3">
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-sm backdrop-blur-sm transition-colors",
                            isCompleted
                                ? "bg-green-500/90 text-white"
                                : isNearCompletion
                                    ? "bg-amber-500/90 text-white"
                                    : "bg-black/60 text-white"
                        )}>
                            <Play className="h-3 w-3 fill-current" />
                            <span className="tabular-nums">{episodesWatched}</span>
                            <span className="opacity-60">/</span>
                            <span className="tabular-nums opacity-80">{totalEpisodes || "?"}</span>
                        </div>
                    </div>

                    {/* Bottom Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-bold text-lg text-white line-clamp-1 drop-shadow-lg">
                            {entry.title}
                        </h3>
                        {lastWatchedText && (
                            <p className="text-white/70 text-sm flex items-center gap-1.5 mt-1">
                                <Clock className="h-3.5 w-3.5" />
                                {lastWatchedText}
                            </p>
                        )}
                    </div>
                </button>

                {/* Progress Section */}
                <div className="p-4 space-y-4">
                    {/* Progress Bar */}
                    {totalEpisodes > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500 ease-out rounded-full",
                                        isCompleted
                                            ? "bg-green-500"
                                            : isNearCompletion
                                                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                                : "bg-gradient-to-r from-primary/80 to-primary"
                                    )}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Date Picker */}
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-10 px-3 text-sm flex-shrink-0",
                                        !lastWatched && "text-muted-foreground",
                                        isWatchedToday && "text-primary font-medium"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {lastWatched ? format(lastWatched, "MMM d") : "Set date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={lastWatched}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="flex-1" />

                        {/* Increment Button */}
                        <Button
                            variant="default"
                            size="default"
                            className="h-10 px-4 gap-2"
                            onClick={handleIncrement}
                            disabled={updating || (totalEpisodes > 0 && episodesWatched >= totalEpisodes)}
                        >
                            {updating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Episode</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Media Details Dialog */}
            <MediaDetailsDialog
                entry={entry}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </>
    );
}
