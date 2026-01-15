"use client";

import { useState } from "react";
import { EpisodeWatchRecord } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns/format"
import { parseISO } from "date-fns/parseISO"
import { differenceInDays } from "date-fns/differenceInDays"

interface EpisodeTrackerProps {
    episodeHistory: EpisodeWatchRecord[];
    newEpisodeNumber: number;
    onNewEpisodeNumberChange: (num: number) => void;
    onAddEpisode: () => void;
    onDeleteEpisode: (idx: number) => void;
    onEditEpisode: (idx: number, newDate: string) => void;
}

export function EpisodeTracker({
    episodeHistory,
    newEpisodeNumber,
    onNewEpisodeNumberChange,
    onAddEpisode,
    onDeleteEpisode,
    onEditEpisode,
}: EpisodeTrackerProps) {
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editingDate, setEditingDate] = useState<string>("");

    const handleStartEdit = (idx: number) => {
        const record = episodeHistory[idx];
        const dateStr = record.watched_at.split('T')[0] + 'T' + record.watched_at.split('T')[1]?.substring(0, 5);
        setEditingIdx(idx);
        setEditingDate(dateStr || new Date().toISOString().substring(0, 16));
    };

    const handleSaveEdit = () => {
        if (editingIdx === null) return;
        onEditEpisode(editingIdx, new Date(editingDate).toISOString());
        setEditingIdx(null);
    };

    const handleCancelEdit = () => {
        setEditingIdx(null);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Episode Watch History</h3>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        className="w-20 text-center"
                        value={newEpisodeNumber}
                        onChange={(e) => onNewEpisodeNumberChange(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <Button onClick={onAddEpisode} size="sm">
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
                                    {editingIdx === idx ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                type="datetime-local"
                                                className="h-8 text-sm w-auto"
                                                value={editingDate}
                                                onChange={(e) => setEditingDate(e.target.value)}
                                            />
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveEdit}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleCancelEdit}>
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
                                {editingIdx !== idx && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleStartEdit(idx)}
                                            title="Edit date"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => onDeleteEpisode(idx)}
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
    );
}
