"use client";

import { MediaStatusHistory } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { History, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/types";

interface StatusHistoryTimelineProps {
    history: MediaStatusHistory[];
    loading?: boolean;
}

export function StatusHistoryTimeline({ history, loading }: StatusHistoryTimelineProps) {
    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin h-6 w-6" />
            </div>
        );
    }

    if (history.length === 0) {
        return <p className="text-muted-foreground text-sm">No history found.</p>;
    }

    return (
        <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {history.map((item) => (
                <div
                    key={item.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
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
                            <time className="text-xs text-muted-foreground">
                                {formatDate(item.changed_at)}
                            </time>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
