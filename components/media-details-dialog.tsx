"use client";

import { useState, useEffect, useRef } from "react";
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
import { format } from "date-fns/format"
import { parseISO } from "date-fns/parseISO"
import { isValid } from "date-fns/isValid"
import { differenceInDays } from "date-fns/differenceInDays"
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
import { updateEntry, createEntry, getStatusHistory, CreateEntryInput, getUniqueFieldValues } from "@/lib/actions";
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
            } else {
                // New entry - initialize with defaults
                setFormData({
                    title: "",
                    status: "Planned",
                    medium: "Movie",
                    episodes_watched: 0,
                });
                setActiveTab("general");
                setEpisodeHistory([]);
                setStatusHistory([]);
                setNewEpisodeNumber(1);
            }
        }
    }, [open, entry]);

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
                price: formData.price,
                average_rating: formData.average_rating,
            };

            if (entry) {
                // Update existing entry
                const result = await updateEntry(entry.id, payload);
                if (result.success) {
                    toast.success("Entry updated");
                    onSuccess?.(result.data);
                    onOpenChange(false);
                } else {
                    toast.error(result.error);
                }
            } else {
                // Create new entry
                const result = await createEntry(payload);
                if (result.success) {
                    toast.success("Entry created");
                    onSuccess?.(result.data);
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

    const isNewEntry = !entry;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
