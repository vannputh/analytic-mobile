"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { MediaEntry, EpisodeWatchRecord, MediaStatusHistory } from "@/lib/database.types";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { BasicDetailsSection } from "@/components/media/forms/BasicDetailsSection";
import {
    Clock,
    Calendar,
    Star,
    Tv,
    Film,
    Hash,
    Globe,
    PlayCircle,
    Pencil,
    History,
    Trash2,
    Check,
    ChevronsUpDown,
    Download,
    Loader2,
    ChevronUp,
    ChevronDown,
    Upload,
    X,
} from "lucide-react";
import { format } from "date-fns/format"
import { parseISO } from "date-fns/parseISO"
import { isValid } from "date-fns/isValid"
import { differenceInDays } from "date-fns/differenceInDays"
import { getPlaceholderPoster, formatDate } from "@/lib/types";
import { formatLanguageForDisplay, normalizeLanguage } from "@/lib/language-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateEntry, createEntry, getStatusHistory, CreateEntryInput, getUniqueFieldValues } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EpisodeTracker } from "@/components/shared/EpisodeTracker";
import { StatusHistoryTimeline } from "@/components/shared/StatusHistoryTimeline";
import { StarRatingInput } from "@/components/form-inputs/StarRatingInput";

// Dynamic import for AdvancedTabContent - only load when advanced tab is opened
const AdvancedTabContent = dynamic(
    () => import("@/components/media/AdvancedTabContent").then(m => m.AdvancedTabContent),
    { ssr: false }
);

interface MediaDetailsDialogProps {
    entry: MediaEntry | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (entry: MediaEntry) => void; // Keeping for compatibility, though likely handled internally now
    onHistory?: (entry: MediaEntry) => void; // Keeping for compatibility
    onDelete?: (id: string) => void;
    onSuccess?: (updatedEntry: MediaEntry) => void;
}

export function MediaDetailsDialog({
    entry,
    open,
    onOpenChange,
    onDelete,
    onSuccess,
}: MediaDetailsDialogProps) {
    const router = useRouter();
    const pathname = usePathname();

    // --- State ---
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(false);

    // Form State (similar to EditEntryDialog)
    const [formData, setFormData] = useState<Partial<CreateEntryInput>>({});

    // History State
    const [statusHistory, setStatusHistory] = useState<MediaStatusHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Episode History State
    const [episodeHistory, setEpisodeHistory] = useState<EpisodeWatchRecord[]>([]);
    const [newEpisodeNumber, setNewEpisodeNumber] = useState<number>(1);
    const [editingEpisodeIdx, setEditingEpisodeIdx] = useState<number | null>(null);
    const [editingEpisodeDate, setEditingEpisodeDate] = useState<string>("");

    // Dropdown Options
    const [dropdownOptions, setDropdownOptions] = useState<{
        types: string[];
        statuses: string[];
        mediums: string[];
        platforms: string[];
        languages: string[];
    }>({ types: [], statuses: [], mediums: [], platforms: [], languages: [] });

    // Metadata Fetching State
    const [fetchingMetadata, setFetchingMetadata] = useState(false);
    const [fetchingSource, setFetchingSource] = useState<"omdb" | "tmdb" | null>(null);

    // New Platform Input State
    const [showNewPlatformInput, setShowNewPlatformInput] = useState(false);
    const [newPlatformValue, setNewPlatformValue] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialFormDataRef = useRef<string | null>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // --- Effects ---

    // Auto-calculate Time Taken
    useEffect(() => {
        if (formData.start_date && formData.finish_date) {
            const start = parseISO(formData.start_date);
            const end = parseISO(formData.finish_date);
            if (isValid(start) && isValid(end)) {
                const days = differenceInDays(end, start);
                if (days >= 0) {
                    setFormData(prev => ({ ...prev, time_taken: `${days + 1} days` }));
                }
            }
        }
    }, [formData.start_date, formData.finish_date]);

    // Load entry data
    useEffect(() => {
        if (open) {
            if (entry) {
                // Handle language parsing (mixed types in DB: text, json string, etc)
                let initialLanguage: string[] = [];
                const val = entry.language as unknown;
                if (Array.isArray(val)) {
                    initialLanguage = val;
                } else if (typeof val === "string") {
                    if (val.trim().startsWith("[")) {
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed)) initialLanguage = parsed;
                            else initialLanguage = [val];
                        } catch {
                            initialLanguage = [val];
                        }
                    } else {
                        initialLanguage = val.split(",").map(s => s.trim().replace(/['"]+/g, ''));
                    }
                }
                initialLanguage = normalizeLanguage(initialLanguage);

                const initial = {
                    title: entry.title,
                    status: entry.status,
                    episodes: entry.episodes,
                    episodes_watched: entry.episodes_watched || 0,
                    my_rating: entry.my_rating,
                    poster_url: entry.poster_url,
                    medium: entry.medium,
                    type: entry.type,
                    platform: entry.platform,
                    season: entry.season,
                    length: entry.length,
                    language: initialLanguage,
                    genre: entry.genre,
                    imdb_id: entry.imdb_id,
                    start_date: entry.start_date,
                    finish_date: entry.finish_date,
                    last_watched_at: entry.last_watched_at,
                    time_taken: entry.time_taken,
                    average_rating: entry.average_rating,
                    price: entry.price,
                };
                setFormData(initial);
                initialFormDataRef.current = JSON.stringify(initial);
                setActiveTab("general");
                loadStatusHistory(entry.id);
                // Load episode history
                if (entry.episode_history) {
                    try {
                        const parsed = JSON.parse(JSON.stringify(entry.episode_history)) as EpisodeWatchRecord[];
                        setEpisodeHistory(parsed.sort((a, b) => b.episode - a.episode));
                    } catch (e) {
                        console.error("Failed to parse episode history", e);
                        setEpisodeHistory([]);
                    }
                } else {
                    setEpisodeHistory([]);
                }
                // Set next episode number
                setNewEpisodeNumber((entry.episodes_watched || 0) + 1);
            } else {
                // New entry - initialize with defaults
                const initial = {
                    title: "",
                    status: "Watching",
                    medium: "Movie",
                    episodes_watched: 0,
                    start_date: new Date().toISOString().split("T")[0],
                };
                setFormData(initial);
                initialFormDataRef.current = JSON.stringify(initial);
                setActiveTab("general");
                setEpisodeHistory([]);
                setStatusHistory([]);
                setNewEpisodeNumber(1);
            }
        }
    }, [open, entry]);

    // When finish_date is set, auto-set status to "Finished"
    useEffect(() => {
        if (formData.finish_date) {
            setFormData(prev => ({ ...prev, status: "Finished" }));
        }
    }, [formData.finish_date]);

    // When status is set to "Finished", auto-sync episodes_watched to episodes
    useEffect(() => {
        if (formData.status === "Finished" && formData.episodes && formData.episodes_watched !== formData.episodes) {
            setFormData(prev => ({ ...prev, episodes_watched: prev.episodes }));
        }
    }, [formData.status, formData.episodes]);

    // When medium is set to "Movie", auto-set episodes to 1
    useEffect(() => {
        if (formData.medium === "Movie" && !formData.episodes) {
            setFormData(prev => ({ ...prev, episodes: 1 }));
        }
    }, [formData.medium]);

    // Load dropdown options
    useEffect(() => {
        async function fetchOptions() {
            const result = await getUniqueFieldValues();
            if (result.success) {
                setDropdownOptions(result.data);
            }
        }
        fetchOptions();
    }, []);

    // Helper to load history
    const loadStatusHistory = async (id: string) => {
        setHistoryLoading(true);
        try {
            const res = await getStatusHistory(id);
            if (res.success) {
                setStatusHistory(res.data);
            }
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    // --- Handlers ---

    const handleSave = async () => {
        if (!formData.title?.trim()) {
            toast.error("Title is required");
            return;
        }
        setLoading(true);
        try {
            // Prepare payload
            const payload: CreateEntryInput = {
                title: formData.title.trim(),
                status: formData.status,
                episodes_watched: formData.episodes_watched,
                episodes: formData.episodes,
                my_rating: formData.my_rating,
                // Include other advanced fields
                medium: formData.medium,
                type: formData.type,
                platform: formData.platform,
                season: formData.season,
                length: formData.length,
                language: formData.language,
                genre: formData.genre,
                imdb_id: formData.imdb_id,
                start_date: formData.start_date,
                finish_date: formData.finish_date,
                poster_url: formData.poster_url,
                time_taken: formData.time_taken,
                price: formData.price ?? 0,
                average_rating: formData.average_rating,
            };

            if (entry) {
                // Update existing entry
                const result = await updateEntry(entry.id, payload);
                if (result.success) {
                    toast.success("Entry updated");
                    onSuccess?.(result.data);
                    initialFormDataRef.current = null;
                    onOpenChange(false);
                } else {
                    toast.error(result.error);
                }
            } else {
                // Create new entry
                const result = await createEntry(payload);
                if (result.success) {
                    const createdEntry = result.data;
                    
                    // Auto-create episode history for Watching or Finished status
                    const shouldAutoCreateEpisodes = 
                        (formData.status === "Watching" || formData.status === "Finished") && 
                        formData.episodes && 
                        formData.episodes > 0;
                    
                    if (shouldAutoCreateEpisodes) {
                        const episodeHistory: EpisodeWatchRecord[] = [];
                        let watchedDate: string;
                        let episodesToCreate: number;
                        
                        if (formData.status === "Watching") {
                            // For Watching: create only episode 1 with start_date
                            watchedDate = formData.start_date || new Date().toISOString();
                            episodesToCreate = 1;
                        } else {
                            // For Finished: create all episodes with finish_date
                            watchedDate = formData.finish_date || new Date().toISOString();
                            episodesToCreate = formData.episodes || 1;
                        }
                        
                        // Build episode history
                        for (let ep = 1; ep <= episodesToCreate; ep++) {
                            episodeHistory.push({
                                episode: ep,
                                watched_at: watchedDate,
                            });
                        }
                        
                        // Update entry with episode history
                        const updateResult = await updateEntry(createdEntry.id, {
                            episode_history: episodeHistory as any,
                            episodes_watched: episodesToCreate,
                            last_watched_at: watchedDate,
                        });
                        
                        if (updateResult.success) {
                            onSuccess?.(updateResult.data);
                        } else {
                            // Still show success for creation, but log the episode history error
                            console.error("Failed to create episode history:", updateResult.error);
                            onSuccess?.(createdEntry);
                        }
                    } else {
                        onSuccess?.(createdEntry);
                    }
                    
                    toast.success("Entry created");
                    initialFormDataRef.current = null;
                    onOpenChange(false);
                } else {
                    toast.error(result.error);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        if (onDelete && entry) {
            onDelete(entry.id);
            initialFormDataRef.current = null;
            setShowDeleteConfirm(false);
            onOpenChange(false);
        }
    };

    // Helper to detect IMDb ID
    const detectIMDbID = (input: string | null | undefined): boolean => {
        if (!input) return false;
        const trimmed = input.trim();
        return /^tt\d{7,8}$/i.test(trimmed);
    };

    const extractIMDbID = (input: string): string | null => {
        // Try direct ID match
        const idMatch = input.match(/tt\d{7,8}/i);
        if (idMatch) return idMatch[0];
        
        // Try URL pattern: https://www.imdb.com/title/tt1234567/
        const urlMatch = input.match(/imdb\.com\/title\/(tt\d{7,8})/i);
        if (urlMatch) return urlMatch[1];
        
        return null;
    };

    const handleIMDbIDChange = async (value: string) => {
        setFormData(p => ({ ...p, imdb_id: value }));
        
        // Extract IMDB ID if URL was pasted
        const extracted = extractIMDbID(value);
        if (extracted && extracted !== value) {
            // URL was pasted, update with just the ID
            setFormData(p => ({ ...p, imdb_id: extracted }));
            
            // Auto-fetch metadata
            await fetchMetadataByParams({
                imdb_id: extracted,
                medium: formData.medium || undefined,
            }, "tmdb");
        }
    };

    const handleIMDbIDBlur = async () => {
        const imdbId = formData.imdb_id?.trim();
        if (!imdbId) return;
        
        const extracted = extractIMDbID(imdbId);
        if (extracted && detectIMDbID(extracted)) {
            // Valid IMDB ID detected on blur, auto-fetch if title is empty
            if (!formData.title?.trim()) {
                await fetchMetadataByParams({
                    imdb_id: extracted,
                    medium: formData.medium || undefined,
                }, "tmdb");
            }
        }
    };

    const handleNewPlatformBlur = () => {
        if (newPlatformValue.trim()) {
            const trimmedValue = newPlatformValue.trim();
            setFormData(p => ({ ...p, platform: trimmedValue }));
            
            // Add to dropdown options if not already present
            setDropdownOptions(prev => {
                if (prev.platforms.includes(trimmedValue)) {
                    return prev;
                }
                return {
                    ...prev,
                    platforms: [...prev.platforms, trimmedValue]
                };
            });
            
            setShowNewPlatformInput(false);
            setNewPlatformValue("");
        } else {
            setShowNewPlatformInput(false);
        }
    };

    const fetchMetadataByParams = async (params: { title?: string; imdb_id?: string; medium?: string; season?: string }, source: "omdb" | "tmdb" = "tmdb") => {
        setFetchingMetadata(true);
        setFetchingSource(source);

        try {
            let url = `/api/metadata?source=${source}`;
            
            if (params.imdb_id) {
                url += `&imdb_id=${encodeURIComponent(params.imdb_id)}`;
            }
            if (params.title) {
                url += `&title=${encodeURIComponent(params.title)}`;
            }
            if (params.medium) {
                const typeMap: Record<string, string> = {
                    "Movie": "movie",
                    "TV Show": "series",
                };
                const omdbType = typeMap[params.medium];
                if (omdbType) {
                    url += `&type=${omdbType}`;
                }
            }
            if (params.season) {
                url += `&season=${encodeURIComponent(params.season)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch metadata");
            }

            const metadata = await response.json();

            // Apply metadata logic
            setFormData(prev => ({
                ...prev,
                title: metadata.title || prev.title,
                poster_url: metadata.poster_url || prev.poster_url,
                genre: metadata.genre ? (Array.isArray(metadata.genre) ? metadata.genre : metadata.genre.split(",").map((g: string) => g.trim()).filter(Boolean)) : prev.genre,
                language: metadata.language ? (Array.isArray(metadata.language) ? metadata.language : metadata.language.split(",").map((l: string) => l.trim()).filter(Boolean)) : prev.language,
                average_rating: metadata.average_rating !== null ? metadata.average_rating : prev.average_rating,
                length: metadata.length || prev.length,
                episodes: metadata.episodes !== null ? metadata.episodes : prev.episodes,
                imdb_id: metadata.imdb_id || prev.imdb_id,
                medium: prev.medium || (metadata.type === "Movie" ? "Movie" : metadata.type === "TV Show" ? "TV Show" : prev.medium),
                type: metadata.content_type || prev.type,
                season: metadata.season || prev.season,
            }));

            toast.success(`Metadata fetched successfully`);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to fetch metadata");
        } finally {
            setFetchingMetadata(false);
            setFetchingSource(null);
        }
    };

    const handleFetchMetadata = async (source: "omdb" | "tmdb") => {
        const isImdbId = detectIMDbID(formData.imdb_id);
        const hasTitle = formData.title?.trim();

        if (!hasTitle && !isImdbId) {
            toast.error("Please enter a title or IMDb ID first");
            return;
        }

        await fetchMetadataByParams({
            title: hasTitle ? formData.title?.trim() : undefined,
            imdb_id: isImdbId ? formData.imdb_id?.trim() : undefined,
            medium: formData.medium || undefined,
            season: formData.season || undefined,
        }, source);
    };

    const handleSelectSearchResult = async (result: any) => {
        // Auto-fetch metadata when user selects from autocomplete
        await fetchMetadataByParams({
            imdb_id: result.imdb_id,
            title: result.title,
            medium: result.media_type === "tv" ? "TV Show" : "Movie",
        }, "tmdb");
    };

    const handleAddEpisode = async () => {
        if (!entry) return;
        const newRecord: EpisodeWatchRecord = {
            episode: newEpisodeNumber,
            watched_at: new Date().toISOString(),
        };
        const updatedHistory = [...episodeHistory, newRecord].sort((a, b) => b.episode - a.episode);
        setEpisodeHistory(updatedHistory);

        // Update the entry
        try {
            const result = await updateEntry(entry.id, {
                episodes_watched: newEpisodeNumber,
                episode_history: updatedHistory as any,
                last_watched_at: newRecord.watched_at,
            });
            if (result.success) {
                toast.success(`Episode ${newEpisodeNumber} recorded`);
                setNewEpisodeNumber(newEpisodeNumber + 1);
                onSuccess?.(result.data);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    const handleDeleteEpisode = async (idx: number) => {
        if (!entry) return;
        const recordToDelete = episodeHistory[idx];
        const updatedHistory = episodeHistory.filter((_, i) => i !== idx);
        const newEpisodesWatched = Math.max(0, updatedHistory.length > 0
            ? Math.max(...updatedHistory.map(r => r.episode))
            : 0);

        setEpisodeHistory(updatedHistory);

        try {
            const result = await updateEntry(entry.id, {
                episodes_watched: newEpisodesWatched,
                episode_history: updatedHistory as any,
            });
            if (result.success) {
                toast.success(`Episode ${recordToDelete.episode} deleted`);
                onSuccess?.(result.data);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    const handleStartEditEpisode = (idx: number) => {
        const record = episodeHistory[idx];
        const dateStr = record.watched_at.split('T')[0] + 'T' + record.watched_at.split('T')[1]?.substring(0, 5);
        setEditingEpisodeIdx(idx);
        setEditingEpisodeDate(dateStr || new Date().toISOString().substring(0, 16));
    };

    const handleSaveEditEpisode = async () => {
        if (!entry || editingEpisodeIdx === null) return;

        const updatedHistory = episodeHistory.map((record, idx) => {
            if (idx === editingEpisodeIdx) {
                return { ...record, watched_at: new Date(editingEpisodeDate).toISOString() };
            }
            return record;
        }).sort((a, b) => b.episode - a.episode);

        setEpisodeHistory(updatedHistory);
        setEditingEpisodeIdx(null);

        try {
            const result = await updateEntry(entry.id, {
                episode_history: updatedHistory as any,
            });
            if (result.success) {
                toast.success("Episode date updated");
                onSuccess?.(result.data);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    const handleFinishedToday = async () => {
        if (!entry || !formData.episodes) {
            toast.error("Please set total episodes first");
            return;
        }

        // Get the last logged episode
        const lastEpisode = episodeHistory.length > 0 ? Math.max(...episodeHistory.map(e => e.episode)) : 0;
        const totalEpisodes = formData.episodes;

        if (lastEpisode >= totalEpisodes) {
            toast.error("All episodes already logged");
            return;
        }

        // Generate new episode records for all remaining episodes
        const today = new Date().toISOString();
        const newRecords: EpisodeWatchRecord[] = [];
        
        for (let ep = lastEpisode + 1; ep <= totalEpisodes; ep++) {
            newRecords.push({
                episode: ep,
                watched_at: today,
            });
        }

        const updatedHistory = [...episodeHistory, ...newRecords].sort((a, b) => b.episode - a.episode);
        setEpisodeHistory(updatedHistory);

        try {
            const result = await updateEntry(entry.id, {
                episodes_watched: totalEpisodes,
                episode_history: updatedHistory as any,
                last_watched_at: today,
            });
            
            if (result.success) {
                toast.success(`Logged episodes ${lastEpisode + 1}-${totalEpisodes} as finished today`);
                setNewEpisodeNumber(totalEpisodes + 1);
                onSuccess?.(result.data);
            } else {
                toast.error(result.error);
                setEpisodeHistory(episodeHistory);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to log episodes");
            setEpisodeHistory(episodeHistory);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be less than 10MB");
            return;
        }

        const toastId = toast.loading("Uploading poster...");

        try {
            const formData = new FormData();
            formData.append('file', file);
            // Use title for filename generation to make it readable
            if (entry?.title) {
                formData.append('title', entry.title);
            }

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setFormData(prev => ({ ...prev, poster_url: data.url }));
            toast.success("Poster uploaded successfully", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to upload poster", { id: toastId });
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            const isDirty =
                initialFormDataRef.current !== null &&
                JSON.stringify(formData) !== initialFormDataRef.current;
            if (isDirty) {
                setShowDiscardConfirm(true);
                return;
            }
            initialFormDataRef.current = null;
        }
        onOpenChange(newOpen);
    };

    const handleConfirmDiscard = () => {
        setShowDiscardConfirm(false);
        initialFormDataRef.current = null;
        onOpenChange(false);
    };

    // --- Render Helpers ---

    const isNewEntry = !entry;

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl p-0 h-[90vh] md:h-[85vh] flex flex-col gap-0 overflow-hidden">
                {/* Mobile Header - visible on small screens */}
                <div className="md:hidden border-b bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                        {/* Small Poster */}
                        <div className="w-12 h-16 relative rounded overflow-hidden border shadow-sm bg-muted flex-shrink-0 group">
                            {formData.poster_url ? (
                                <SafeImage
                                    src={formData.poster_url}
                                    alt={formData.title || "New Entry"}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-lg text-muted-foreground">
                                    {getPlaceholderPoster(formData.type || null)}
                                </div>
                            )}
                        </div>
                        {/* Title */}
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="font-semibold text-base truncate h-auto leading-none">
                                {isNewEntry ? "Add New Entry" : formData.title}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground mt-1">
                                {!isNewEntry && entry?.start_date ? format(parseISO(entry.start_date), "yyyy") : (isNewEntry ? "Add a new media entry to your library" : "")}
                            </DialogDescription>
                        </div>
                    </div>
                    {/* Horizontal Tabs */}
                    <div className="flex gap-1 mt-3 overflow-x-auto">
                        {(["general", "advanced", "episodes", "history"] as const).map(tab => (
                            <Button
                                key={tab}
                                variant={activeTab === tab ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 text-xs flex-shrink-0",
                                    activeTab === tab && "bg-secondary font-medium"
                                )}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                    {/* Desktop Sidebar (Left Column) - hidden on mobile */}
                    <div className="hidden md:flex w-64 bg-muted/30 border-r flex-col p-5 gap-5 overflow-y-auto shrink-0">
                        {/* Poster */}
                        <div className="aspect-[2/3] relative rounded-lg overflow-hidden border shadow-sm bg-muted self-center w-full group shrink-0">
                            {formData.poster_url ? (
                                <SafeImage
                                    src={formData.poster_url}
                                    alt={formData.title || "New Entry"}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
                                    {getPlaceholderPoster(formData.type || null)}
                                </div>
                            )}

                            {/* Quick upload overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:text-white hover:bg-white/20"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Change
                                </Button>
                            </div>
                        </div>

                        {/* Navigation Tabs (Vertical) */}
                        <div className="flex flex-col gap-1 w-full flex-1">
                            {(["general", "advanced", "episodes", "history"] as const).map(tab => (
                                <Button
                                    key={tab}
                                    variant={activeTab === tab ? "secondary" : "ghost"}
                                    className={cn(
                                        "justify-start h-9 truncate",
                                        activeTab === tab && "bg-secondary font-medium"
                                    )}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area (Right Column) */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-full">
                        {/* Desktop Header - hidden on mobile */}
                        <DialogHeader className="hidden md:block px-6 py-4 border-b shrink-0">
                            <DialogTitle className="text-xl truncate" title={formData.title || "New Entry"}>
                                {isNewEntry ? "Add New Entry" : formData.title}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">
                                {!isNewEntry && entry?.start_date ? `Released in ${format(parseISO(entry.start_date), "yyyy")}` : (isNewEntry ? "Enter the details for the new media entry" : "")}
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="flex-1">
                            <div className="p-4 md:p-6">
                                {/* GENERAL TAB */}
                                {activeTab === "general" && (
                                    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Title with Autocomplete */}
                                        <div className="col-span-full">
                                            <BasicDetailsSection
                                                title={formData.title || null}
                                                onChange={(value) => setFormData(p => ({ ...p, title: value }))}
                                                onSelectResult={handleSelectSearchResult}
                                                autoFocus={isNewEntry}
                                            />
                                        </div>

                                        {/* Status */}
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select
                                                value={formData.status || "Planned"}
                                                onValueChange={(val) => setFormData(p => ({ ...p, status: val }))}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {dropdownOptions.statuses.map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Medium */}
                                        <div className="space-y-2">
                                            <Label>Medium</Label>
                                            <Select
                                                value={formData.medium || undefined}
                                                onValueChange={(val) => setFormData(p => ({ ...p, medium: val }))}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {dropdownOptions.mediums.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Platform */}
                                        <div className="space-y-2">
                                            <Label>Platform</Label>
                                            {showNewPlatformInput ? (
                                                <Input
                                                    value={newPlatformValue}
                                                    onChange={(e) => setNewPlatformValue(e.target.value)}
                                                    placeholder="Enter new platform"
                                                    onBlur={handleNewPlatformBlur}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <Select
                                                    value={formData.platform || "__none__"}
                                                    onValueChange={(val) => {
                                                        if (val === "__new__") {
                                                            setShowNewPlatformInput(true);
                                                        } else {
                                                            setFormData(p => ({ ...p, platform: val === "__none__" ? null : val }));
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">None</SelectItem>
                                                        {dropdownOptions.platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                        <SelectItem value="__new__">+ New Platform</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        {/* IMDb ID */}
                                        <div className="space-y-2">
                                            <Label>IMDb ID</Label>
                                            <Input
                                                value={formData.imdb_id || ""}
                                                onChange={(e) => handleIMDbIDChange(e.target.value)}
                                                onBlur={handleIMDbIDBlur}
                                                placeholder="tt1234567 or paste IMDB URL"
                                            />
                                        </div>

                                        {/* Start Date */}
                                        <div className="space-y-2">
                                            <Label>Start Date</Label>
                                            <Input
                                                type="date"
                                                value={formData.start_date ? formData.start_date.split('T')[0] : ""}
                                                onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
                                            />
                                        </div>

                                        {/* Finish Date */}
                                        <div className="space-y-2">
                                            <Label>Finish Date</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="date"
                                                    value={formData.finish_date ? formData.finish_date.split('T')[0] : ""}
                                                    onChange={(e) => setFormData(p => ({ ...p, finish_date: e.target.value }))}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (formData.start_date) {
                                                            setFormData(p => ({ ...p, finish_date: p.start_date }));
                                                            toast.success("Finish date matched to start date");
                                                        } else {
                                                            toast.error("Please set start date first");
                                                        }
                                                    }}
                                                    disabled={!formData.start_date}
                                                    title="Match start date"
                                                >
                                                    Match
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Episodes Progress */}
                                        <div className="col-span-full space-y-2">
                                            <Label>Episodes Watched</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    className="w-24 text-center"
                                                    value={formData.episodes_watched || 0}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        setFormData(p => ({ ...p, episodes_watched: val }));
                                                    }}
                                                />
                                                <span className="text-muted-foreground">/</span>
                                                <Input
                                                    type="number"
                                                    className="w-24 text-center"
                                                    placeholder="Total"
                                                    value={formData.episodes || ""}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setFormData(p => ({ ...p, episodes: isNaN(val) ? null : val }));
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Rating */}
                                        <div className="col-span-full space-y-2">
                                            <Label>My Rating</Label>
                                            <StarRatingInput
                                                value={formData.my_rating}
                                                onChange={(val) => setFormData(p => ({ ...p, my_rating: val }))}
                                            />
                                        </div>

                                        {/* Poster URL */}
                                        <div className="col-span-full space-y-2">
                                            <Label>Poster URL</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.poster_url || ""}
                                                    onChange={(e) => setFormData(p => ({ ...p, poster_url: e.target.value }))}
                                                    className="flex-1"
                                                    placeholder="https://..."
                                                />
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    title="Upload new poster"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="col-span-full space-y-2">
                                            <Label>Notes</Label>
                                            <Textarea
                                                placeholder="Notes are not yet supported for the main entry."
                                                disabled
                                                className="resize-none h-20"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* EPISODES TAB */}
                                {activeTab === "episodes" && (
                                    <EpisodeTracker
                                        episodeHistory={episodeHistory}
                                        newEpisodeNumber={newEpisodeNumber}
                                        onNewEpisodeNumberChange={setNewEpisodeNumber}
                                        onAddEpisode={handleAddEpisode}
                                        onDeleteEpisode={handleDeleteEpisode}
                                        onEditEpisode={async (idx, newDate) => {
                                            if (!entry) return;
                                            const updatedHistory = episodeHistory.map((record, i) =>
                                                i === idx ? { ...record, watched_at: newDate } : record
                                            ).sort((a, b) => b.episode - a.episode);
                                            setEpisodeHistory(updatedHistory);
                                            try {
                                                const result = await updateEntry(entry.id, {
                                                    episode_history: updatedHistory as any,
                                                });
                                                if (result.success) {
                                                    toast.success("Episode date updated");
                                                    onSuccess?.(result.data);
                                                } else {
                                                    toast.error(result.error);
                                                }
                                            } catch (error) {
                                                console.error(error);
                                                toast.error("An error occurred");
                                            }
                                        }}
                                        onFinishedToday={handleFinishedToday}
                                        totalEpisodes={formData.episodes}
                                    />
                                )}

                                {/* ADVANCED TAB */}
                                {activeTab === "advanced" && (
                                    <AdvancedTabContent
                                        formData={formData}
                                        onFormChange={setFormData}
                                        dropdownOptions={{
                                            types: dropdownOptions.types,
                                            languages: dropdownOptions.languages,
                                        }}
                                    />
                                )}

                                {/* HISTORY TAB */}
                                {activeTab === "history" && (
                                    <div className="space-y-4">
                                        <h3 className="font-medium">Status History</h3>
                                        <StatusHistoryTimeline history={statusHistory} loading={historyLoading} />
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <DialogFooter className="border-t p-4 flex flex-wrap justify-between gap-2 bg-muted/20 shrink-0 w-full z-10">
                            <div className="flex gap-2">
                                {!isNewEntry && onDelete && (
                                    <Button
                                        variant="outline"
                                        className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:hover:bg-red-950 dark:text-red-400"
                                        onClick={handleDeleteClick}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                                <Button onClick={handleSave} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent >
        </Dialog >

        <ConfirmDialog
            open={showDiscardConfirm}
            onOpenChange={setShowDiscardConfirm}
            title="Unsaved changes"
            description="You have unsaved changes. Discard them?"
            cancelLabel="Keep editing"
            confirmLabel="Discard"
            variant="destructive"
            onConfirm={handleConfirmDiscard}
        />
        <ConfirmDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            title="Delete entry?"
            description={entry ? `This will permanently remove "${entry.title}" from your library. This action cannot be undone.` : ""}
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={handleDeleteConfirm}
        />
        </>
    );
}
