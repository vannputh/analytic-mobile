"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MediaEntry } from "@/lib/database.types";

interface UseBatchMetadataFetchOptions {
    onComplete?: () => void;
}

export function useBatchMetadataFetch(options?: UseBatchMetadataFetchOptions) {
    const [fetching, setFetching] = useState(false);
    const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

    const fetchMetadataForEntries = async (entries: MediaEntry[]) => {
        if (entries.length === 0) {
            toast.error("No entries to fetch");
            return;
        }

        setFetching(true);
        setFetchProgress({ current: 0, total: entries.length });

        let successCount = 0;
        let failedCount = 0;

        try {
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];

                if (!entry.title?.trim()) {
                    setFetchProgress({ current: i + 1, total: entries.length });
                    continue;
                }

                try {
                    let url = `/api/metadata?title=${encodeURIComponent(entry.title.trim())}`;

                    if (entry.medium === "Book") {
                        url += `&medium=${encodeURIComponent(entry.medium)}`;
                    } else if (entry.medium) {
                        const typeMap: Record<string, string> = {
                            Movie: "movie",
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

                        const updateData: Record<string, unknown> = {};
                        if (meta.genre && !entry.genre) {
                            updateData.genre = Array.isArray(meta.genre)
                                ? meta.genre
                                : meta.genre.split(",").map((g: string) => g.trim()).filter(Boolean);
                        }
                        if (meta.language && !entry.language) {
                            updateData.language = Array.isArray(meta.language)
                                ? meta.language
                                : meta.language.split(",").map((l: string) => l.trim()).filter(Boolean);
                        }
                        if (meta.average_rating && !entry.average_rating) updateData.average_rating = meta.average_rating;
                        if (meta.length && !entry.length) updateData.length = meta.length;
                        if (meta.episodes && !entry.episodes) updateData.episodes = meta.episodes;
                        if (meta.poster_url && !entry.poster_url) updateData.poster_url = meta.poster_url;
                        if (meta.season && !entry.season) updateData.season = meta.season;
                        if (meta.imdb_id && !entry.imdb_id) updateData.imdb_id = meta.imdb_id;

                        if (Object.keys(updateData).length > 0) {
                            const { error } = await (supabase
                                .from("media_entries" as any) as any)
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

                setFetchProgress({ current: i + 1, total: entries.length });

                if (i < entries.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            if (successCount > 0) {
                toast.success(
                    `Fetched metadata for ${successCount} items${failedCount > 0 ? `, ${failedCount} failed` : ""}`
                );
                options?.onComplete?.();
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
    };

    return {
        fetching,
        fetchProgress,
        fetchMetadataForEntries,
    };
}
