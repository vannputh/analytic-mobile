"use client";

import { useState, useEffect, useRef } from "react";
import { MediaEntry, EpisodeWatchRecord, MediaStatusHistory } from "@/lib/database.types";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
    Clock,
    Calendar,
    Star,
    Tv,
    Film,
    Hash,
    Globe,
    PlayCircle,
    BookOpen,
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
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import { getPlaceholderPoster, formatDate } from "@/lib/types";
import { formatLanguageForDisplay } from "@/lib/language-utils";
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
import { updateEntry, getStatusHistory, CreateEntryInput, getUniqueFieldValues } from "@/lib/actions";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (open && entry) {
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

            setFormData({
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
            });
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
        }
    }, [open, entry]);

    // Load dropdown options
    useEffect(() => {
        async function fetchOptions() {
            const result = await getUniqueFieldValues();
            if (result.success && result.data) {
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
            if (res.success && res.data) {
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
        if (!entry) return;
        setLoading(true);
        try {
            // Prepare payload
            const payload: CreateEntryInput = {
                title: formData.title || entry.title,
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
                price: formData.price,
                average_rating: formData.average_rating,
            };

            const result = await updateEntry(entry.id, payload);
            if (result.success && result.data) {
                toast.success("Entry updated");
                onSuccess?.(result.data);
                onOpenChange(false);
            } else {
                toast.error(result.error || "Failed to update");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        if (onDelete && entry) {
            if (confirm("Are you sure you want to delete this entry?")) {
                onDelete(entry.id);
                onOpenChange(false);
            }
        }
    };

    // Helper functions for detecting ISBN and IMDb ID
    const detectISBN = (input: string | null | undefined): string | null => {
        if (!input) return null;
        const cleaned = input.replace(/[^0-9X]/g, '');
        if (/^(978|979)\d{10}$/.test(cleaned)) return cleaned;
        if (/^\d{9}[\dX]$/.test(cleaned)) return cleaned;
        return null;
    };

    const detectIMDbID = (input: string | null | undefined): boolean => {
        if (!input) return false;
        const trimmed = input.trim();
        return /^tt\d{7,8}$/i.test(trimmed);
    };

    const handleFetchMetadata = async (source: "omdb" | "tmdb") => {
        const isbn = detectISBN(formData.imdb_id);
        const isImdbId = detectIMDbID(formData.imdb_id);
        const hasTitle = formData.title?.trim();

        if (!hasTitle && !isbn && !isImdbId) {
            toast.error("Please enter a title, ISBN, or IMDb ID first");
            return;
        }

        setFetchingMetadata(true);
        setFetchingSource(source);

        try {
            let url = "";

            if (isbn || isImdbId) {
                url = `/api/metadata?imdb_id=${encodeURIComponent(formData.imdb_id!.trim())}&source=${source}`;
                if (hasTitle && formData.title) {
                    url += `&title=${encodeURIComponent(formData.title.trim())}`;
                }
            } else {
                url = `/api/metadata?title=${encodeURIComponent((formData.title || "").trim())}&source=${source}`;
            }

            if (formData.medium) {
                if (formData.medium === "Book") {
                    url += `&medium=${encodeURIComponent(formData.medium)}`;
                } else {
                    const typeMap: Record<string, string> = {
                        "Movie": "movie",
                        "TV Show": "series",
                    };
                    const omdbType = typeMap[formData.medium];
                    if (omdbType) {
                        url += `&type=${omdbType}`;
                    }
                }
            } else if (isbn) {
                url += `&medium=Book`;
            }

            if (formData.season) {
                url += `&season=${encodeURIComponent(formData.season)}`;
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
                // Only set type/medium if it was missing to avoid overwriting user choice unintentionally, or ask user. 
                // For simplicity in this dialog, we'll keep existing unless empty.
                medium: prev.medium || (metadata.type === "movie" ? "Movie" : metadata.type === "series" ? "TV Show" : prev.medium),
            }));

            toast.success(`Updated from ${source.toUpperCase()}`);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to fetch metadata");
        } finally {
            setFetchingMetadata(false);
            setFetchingSource(null);
        }
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
            if (result.success && result.data) {
                toast.success(`Episode ${newEpisodeNumber} recorded`);
                setNewEpisodeNumber(newEpisodeNumber + 1);
                onSuccess?.(result.data);
            } else {
                toast.error(result.error || "Failed to add episode");
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
            if (result.success && result.data) {
                toast.success(`Episode ${recordToDelete.episode} deleted`);
                onSuccess?.(result.data);
            } else {
                toast.error(result.error || "Failed to delete episode");
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
            if (result.success && result.data) {
                toast.success("Episode date updated");
                onSuccess?.(result.data);
            } else {
                toast.error(result.error || "Failed to update episode");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
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

    // --- Render Helpers ---

    if (!entry) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 h-[85vh] flex flex-col gap-0 overflow-hidden">
                <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
                    {/* Sidebar (Left Column) */}
                    <div className="w-full md:w-64 bg-muted/30 border-r flex flex-col p-5 gap-5 overflow-y-auto shrink-0">
                        {/* Poster */}
                        <div className="aspect-[2/3] relative rounded-lg overflow-hidden border shadow-sm bg-muted self-center w-36 md:w-full group shrink-0">
                            {formData.poster_url ? (
                                <SafeImage
                                    src={formData.poster_url}
                                    alt={entry.title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
                                    {getPlaceholderPoster(entry.type)}
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
                        <DialogHeader className="px-6 py-4 border-b shrink-0">
                            <DialogTitle className="text-xl truncate" title={entry.title}>
                                {entry.title} <span className="text-muted-foreground font-normal text-base ml-2">({entry.start_date ? format(parseISO(entry.start_date), "yyyy") : "Unknown Year"})</span>
                            </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                {/* GENERAL TAB */}
                                {activeTab === "general" && (
                                    <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Title with Metadata Fetch */}
                                        <div className="col-span-full space-y-2">
                                            <Label>Title</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.title || ""}
                                                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="font-medium transition-all"
                                                    onClick={() => handleFetchMetadata("omdb")}
                                                    disabled={fetchingMetadata}
                                                >
                                                    {fetchingMetadata && fetchingSource === "omdb" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Film className="h-4 w-4 mr-2" />
                                                    )}
                                                    OMDB
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="font-medium transition-all"
                                                    onClick={() => handleFetchMetadata("tmdb")}
                                                    disabled={fetchingMetadata}
                                                >
                                                    {fetchingMetadata && fetchingSource === "tmdb" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Tv className="h-4 w-4 mr-2" />
                                                    )}
                                                    TMDB
                                                </Button>
                                            </div>
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
                                            <Select
                                                value={formData.platform || undefined}
                                                onValueChange={(val) => setFormData(p => ({ ...p, platform: val }))}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {dropdownOptions.platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* IMDb ID */}
                                        <div className="space-y-2">
                                            <Label>IMDb ID / ISBN</Label>
                                            <Input
                                                value={formData.imdb_id || ""}
                                                onChange={(e) => setFormData(p => ({ ...p, imdb_id: e.target.value }))}
                                                placeholder="tt1234567 or ISBN"
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
                                            <Input
                                                type="date"
                                                value={formData.finish_date ? formData.finish_date.split('T')[0] : ""}
                                                onChange={(e) => setFormData(p => ({ ...p, finish_date: e.target.value }))}
                                            />
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
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center border rounded-md h-10 pl-3 pr-1 min-w-[5rem] justify-between bg-background">
                                                    <span className="font-medium">{formData.my_rating || "--"}</span>
                                                    <div className="flex flex-col border-l ml-2">
                                                        <button
                                                            type="button"
                                                            className="h-5 w-6 flex items-center justify-center hover:bg-muted rounded-tr-sm transition-colors"
                                                            onClick={() => setFormData(p => ({ ...p, my_rating: Math.min(10, (p.my_rating || 0) + 1) }))}
                                                        >
                                                            <ChevronUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="h-5 w-6 flex items-center justify-center hover:bg-muted rounded-br-sm transition-colors"
                                                            onClick={() => setFormData(p => ({ ...p, my_rating: Math.max(0, (p.my_rating || 0) - 1) }))}
                                                        >
                                                            <ChevronDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex text-yellow-500 gap-0.5">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                                        <Star
                                                            key={star}
                                                            className={cn(
                                                                "h-5 w-5 cursor-pointer hover:scale-110 transition-transform",
                                                                (formData.my_rating || 0) >= star ? "fill-current" : "text-muted-foreground/30"
                                                            )}
                                                            onClick={() => setFormData(p => ({ ...p, my_rating: star }))}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-base font-medium">
                                                    {formData.my_rating ? formData.my_rating + ".0" : "0.0"}/10
                                                </span>
                                            </div>
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
                                    <div className="space-y-6 max-w-2xl">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-lg">Episode Watch History</h3>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-center"
                                                    value={newEpisodeNumber}
                                                    onChange={(e) => setNewEpisodeNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                                />
                                                <Button onClick={handleAddEpisode} size="sm">
                                                    <PlayCircle className="mr-2 h-4 w-4" />
                                                    Add Episode
                                                </Button>
                                            </div>
                                        </div>

                                        {episodeHistory.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                <p>No episodes recorded yet</p>
                                                <p className="text-sm">Click "Add Episode" to start tracking</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {episodeHistory.map((record, idx) => (
                                                    <div
                                                        key={`${record.episode}-${record.watched_at}`}
                                                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-semibold">
                                                                {record.episode}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">Episode {record.episode}</div>
                                                                {editingEpisodeIdx === idx ? (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Input
                                                                            type="datetime-local"
                                                                            className="h-8 text-sm w-auto"
                                                                            value={editingEpisodeDate}
                                                                            onChange={(e) => setEditingEpisodeDate(e.target.value)}
                                                                        />
                                                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveEditEpisode}>
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingEpisodeIdx(null)}>
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {format(parseISO(record.watched_at), "PPP 'at' p")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-xs">
                                                                {differenceInDays(new Date(), parseISO(record.watched_at))} days ago
                                                            </Badge>
                                                            {editingEpisodeIdx !== idx && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => handleStartEditEpisode(idx)}
                                                                        title="Edit date"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                                        onClick={() => handleDeleteEpisode(idx)}
                                                                        title="Delete episode"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ADVANCED TAB */}
                                {activeTab === "advanced" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Type */}
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select
                                                value={formData.type || undefined}
                                                onValueChange={(val) => setFormData(p => ({ ...p, type: val }))}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {dropdownOptions.types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Season */}
                                        <div className="space-y-2">
                                            <Label>Season</Label>
                                            <Input
                                                value={formData.season || ""}
                                                onChange={(e) => setFormData(p => ({ ...p, season: e.target.value }))}
                                                placeholder="e.g. Season 1, 2024"
                                            />
                                        </div>

                                        {/* Length/Duration */}
                                        <div className="space-y-2">
                                            <Label>Length / Duration</Label>
                                            <Input
                                                value={formData.length || ""}
                                                onChange={(e) => setFormData(p => ({ ...p, length: e.target.value }))}
                                                placeholder="e.g. 2h 30m, 320 pages"
                                            />
                                        </div>

                                        {/* Time Taken - Auto-calculated */}
                                        <div className="space-y-2">
                                            <Label>Time Taken</Label>
                                            <Input
                                                value={formData.time_taken || ""}
                                                readOnly
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                                placeholder="Auto-calculated from dates"
                                            />
                                        </div>

                                        {/* Price */}
                                        <div className="space-y-2">
                                            <Label>Price</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.price ?? ""}
                                                onChange={(e) => setFormData(p => ({ ...p, price: e.target.value ? parseFloat(e.target.value) : null }))}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Average Rating (from external source) */}
                                        <div className="space-y-2">
                                            <Label>Average Rating (IMDb/External)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                value={formData.average_rating ?? ""}
                                                onChange={(e) => setFormData(p => ({ ...p, average_rating: e.target.value ? parseFloat(e.target.value) : null }))}
                                                placeholder="e.g. 8.5"
                                            />
                                        </div>

                                        {/* Language - Dropdown */}
                                        <div className="col-span-full space-y-2">
                                            <Label>Language</Label>
                                            <Select
                                                value={formData.language?.[0] || undefined}
                                                onValueChange={(val) => setFormData(p => ({ ...p, language: [val] }))}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select Language..." /></SelectTrigger>
                                                <SelectContent>
                                                    {dropdownOptions.languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Genre */}
                                        <div className="col-span-full space-y-2">
                                            <Label>Genre(s)</Label>
                                            <Input
                                                value={Array.isArray(formData.genre) ? formData.genre.join(", ") : (formData.genre || "")}
                                                onChange={(e) => setFormData(p => ({
                                                    ...p,
                                                    genre: e.target.value.split(",").map(g => g.trim()).filter(Boolean)
                                                }))}
                                                placeholder="Action, Drama, Comedy"
                                            />
                                            <p className="text-xs text-muted-foreground">Separate multiple genres with commas</p>
                                        </div>
                                    </div>
                                )}

                                {/* HISTORY TAB */}
                                {activeTab === "history" && (
                                    <div className="space-y-4">
                                        <h3 className="font-medium">Status History</h3>
                                        {historyLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6" /></div>
                                        ) : statusHistory.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No history found.</p>
                                        ) : (
                                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                                {statusHistory.map((item, idx) => (
                                                    <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                        {/* Icon */}
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                            <History className="w-4 h-4" />
                                                        </div>

                                                        {/* Card */}
                                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded border shadow-sm">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Badge variant="outline">{item.old_status || "None"}</Badge>
                                                                    <span>→</span>
                                                                    <Badge variant="default">{item.new_status}</Badge>
                                                                </div>
                                                                <time className="text-xs text-muted-foreground">{formatDate(item.changed_at)}</time>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <DialogFooter className="border-t p-4 flex justify-between bg-muted/20 shrink-0 w-full z-10">
                            <Button
                                variant="outline"
                                className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:hover:bg-red-950 dark:text-red-400"
                                onClick={handleDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
    );
}
