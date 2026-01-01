"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MediaEntry } from "@/lib/database.types";
import { PageHeader } from "@/components/page-header";
import { WatchingCard } from "@/components/watching-card";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle, Plus } from "lucide-react";
import { WatchingCardSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { toast } from "sonner";

export default function WatchingPage() {
    const [entries, setEntries] = useState<MediaEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchWatchingEntries();
    }, []);

    async function fetchWatchingEntries() {
        try {
            setLoading(true);
            // Fetch entries that are "Watching"
            const { data, error } = await supabase
                .from("media_entries")
                .select("*")
                .eq("status", "Watching")
                .order("last_watched_at", { ascending: false })
                .order("updated_at", { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error("Error fetching watching entries:", error);
            toast.error("Failed to load watching list");
        } finally {
            setLoading(false);
        }
    }

    const handleEntryUpdate = (updatedEntry: MediaEntry) => {
        setEntries(prev => {
            // If the entry is finished or dropped, remove it from the list
            if (updatedEntry.status !== "Watching") {
                return prev.filter(e => e.id !== updatedEntry.id);
            }
            // Otherwise update it and re-sort
            return prev.map(e => e.id === updatedEntry.id ? updatedEntry : e)
                .sort((a, b) => {
                    const dateA = a.last_watched_at ? new Date(a.last_watched_at).getTime() : 0;
                    const dateB = b.last_watched_at ? new Date(b.last_watched_at).getTime() : 0;
                    return dateB - dateA;
                });
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <PageHeader title="Currently Watching" />

                <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <WatchingCardSkeleton key={i} />
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Currently Watching" />

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                        <div className="rounded-full bg-muted p-4">
                            <PlayCircle className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold tracking-tight">Nothing in progress</h2>
                            <p className="text-muted-foreground max-w-sm">
                                Start watching something new or mark an entry as "Watching" to see it here.
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/add">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Entry
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {entries.map((entry) => (
                            <WatchingCard
                                key={entry.id}
                                entry={entry}
                                onUpdate={handleEntryUpdate}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
