"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaStatusHistory, EpisodeWatchRecord } from "@/lib/database.types";
import { getStatusHistory, restartEntry } from "@/lib/actions";
import { formatDate } from "@/lib/types";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StatusHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaEntryId: string;
  mediaTitle: string;
  currentStatus: string | null;
  onRestart?: () => void;
  episodeHistory?: EpisodeWatchRecord[];
}

export function StatusHistoryDialog({
  open,
  onOpenChange,
  mediaEntryId,
  mediaTitle,
  currentStatus,
  onRestart,
  episodeHistory = [],
}: StatusHistoryDialogProps) {
  const [history, setHistory] = useState<MediaStatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (open && mediaEntryId) {
      loadHistory();
    }
  }, [open, mediaEntryId]);

  async function loadHistory() {
    setLoading(true);
    try {
      const result = await getStatusHistory(mediaEntryId);
      if (result.success && result.data) {
        setHistory(result.data);
      } else {
        toast.error(result.error || "Failed to load history");
      }
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestart() {
    if (currentStatus !== "Dropped" && currentStatus !== "On Hold") {
      toast.error("Can only restart items that are Dropped or On Hold");
      return;
    }

    setRestarting(true);
    try {
      const result = await restartEntry(mediaEntryId);
      if (result.success) {
        toast.success("Item restarted successfully");
        onRestart?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to restart item");
      }
    } catch (error) {
      console.error("Error restarting:", error);
      toast.error("Failed to restart item");
    } finally {
      setRestarting(false);
    }
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return "";
    switch (status) {
      case "Finished":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Watching":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "On Hold":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Dropped":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "";
    }
  };

  const canRestart = currentStatus === "Dropped" || currentStatus === "On Hold";
  const droppedOrOnHoldHistory = history.filter(
    (h) => h.new_status === "Dropped" || h.new_status === "On Hold"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Status History: {mediaTitle}</DialogTitle>
          <DialogDescription>
            View the history of status changes for this item
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="episodes" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="episodes">Episode History</TabsTrigger>
            <TabsTrigger value="status">Status History</TabsTrigger>
          </TabsList>

          {/* Episode History Tab */}
          <TabsContent value="episodes" className="mt-4">
            {episodeHistory.length > 0 ? (
              <ScrollArea className="max-h-80">
                <div className="space-y-2">
                  {[...episodeHistory].sort((a, b) => a.episode - b.episode).map((ep) => (
                    <div
                      key={ep.episode}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                          {ep.episode}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Episode {ep.episode}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ep.watched_at), "EEEE, MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 border rounded-xl border-dashed bg-muted/20">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📺</span>
                </div>
                <p className="font-medium text-foreground">No episodes tracked yet</p>
                <p className="text-sm text-muted-foreground mt-1">Episode history will appear here</p>
              </div>
            )}
          </TabsContent>

          {/* Status History Tab */}
          <TabsContent value="status" className="mt-4">
            {canRestart && (
              <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    This item is currently {currentStatus}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can restart it to continue watching/reading
                  </p>
                </div>
                <Button
                  onClick={handleRestart}
                  disabled={restarting}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {restarting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Restart
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No status history available
              </div>
            ) : (
              <div className="space-y-4">
                {droppedOrOnHoldHistory.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Dropped / On Hold History
                    </h3>
                    <div className="space-y-3">
                      {droppedOrOnHoldHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={getStatusColor(entry.old_status)}
                              >
                                {entry.old_status || "N/A"}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge
                                variant="outline"
                                className={getStatusColor(entry.new_status)}
                              >
                                {entry.new_status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.changed_at)}
                            </p>
                            {entry.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                    All Status Changes
                  </h3>
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={getStatusColor(entry.old_status)}
                            >
                              {entry.old_status || "N/A"}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge
                              variant="outline"
                              className={getStatusColor(entry.new_status)}
                            >
                              {entry.new_status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.changed_at)}
                          </p>
                          {entry.notes && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}






