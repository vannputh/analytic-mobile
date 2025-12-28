"use client";

import { SafeImage } from "@/components/ui/safe-image";
import { MediaEntry } from "@/lib/database.types";
import { getPlaceholderPoster, formatDate } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Star } from "lucide-react";

interface MediaCardGridProps {
  entries: MediaEntry[];
  onEdit?: (entry: MediaEntry) => void;
  onDelete?: (id: string) => void;
}

export function MediaCardGrid({
  entries,
  onEdit,
  onDelete,
}: MediaCardGridProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Finished":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "In Progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "On Hold":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Dropped":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "";
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No entries found. Add your first media entry!
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => (
        <Card
          key={entry.id}
          className="overflow-hidden hover:shadow-lg transition-shadow group"
        >
          {/* Poster */}
          <div className="aspect-[2/3] relative bg-muted">
            <SafeImage
              src={entry.poster_url || ""}
              alt={entry.title}
              fill
              className="object-cover"
              fallbackElement={
                <div className="flex items-center justify-center h-full text-6xl">
                  {getPlaceholderPoster(entry.type)}
                </div>
              }
            />

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEdit?.(entry)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete?.(entry.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>

            {/* Rating Badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {entry.my_rating && (
                <div className="bg-black/80 text-white px-2 py-1 rounded flex items-center gap-1 text-sm font-semibold">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {entry.my_rating}
                  <span className="text-xs text-gray-300 ml-1">Me</span>
                </div>
              )}
              {entry.average_rating && (
                <div className="bg-black/80 text-white px-2 py-1 rounded flex items-center gap-1 text-sm font-semibold">
                  <Star className="h-3 w-3 fill-blue-400 text-blue-400" />
                  {entry.average_rating}
                  <span className="text-xs text-gray-300 ml-1">Avg</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-lg line-clamp-2">
                {entry.title}
              </h3>
              {entry.season && (
                <p className="text-sm text-muted-foreground">{entry.season}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {entry.type && (
                <Badge variant="outline" className="text-xs">
                  {entry.type}
                </Badge>
              )}
              {entry.status && (
                <Badge className={`text-xs ${getStatusColor(entry.status)}`}>
                  {entry.status}
                </Badge>
              )}
            </div>

            {entry.genre && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {entry.genre}
              </p>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              {entry.platform && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Platform:</span>
                  <span>{entry.platform}</span>
                </div>
              )}
              {entry.start_date && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Started:</span>
                  <span>{formatDate(entry.start_date)}</span>
                </div>
              )}
              {entry.finish_date && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Finished:</span>
                  <span>{formatDate(entry.finish_date)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

