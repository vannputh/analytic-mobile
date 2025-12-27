"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  PLATFORM_OPTIONS,
  MEDIUM_OPTIONS,
} from "@/lib/types";
import { Search } from "lucide-react";

interface FiltersProps {
  search: string;
  type: string;
  status: string;
  platform: string;
  medium: string;
  genre: string;
  genres?: string[]; // Available genres from entries
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onMediumChange: (value: string) => void;
  onGenreChange: (value: string) => void;
}

export function Filters({
  search,
  type,
  status,
  platform,
  medium,
  genre,
  genres = [],
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onPlatformChange,
  onMediumChange,
  onGenreChange,
}: FiltersProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value)
              }}
              onKeyDown={(e) => {
                // Prevent form submission on Enter key
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger id="type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="platform">Platform</Label>
          <Select value={platform} onValueChange={onPlatformChange}>
            <SelectTrigger id="platform">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORM_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="medium">Medium</Label>
          <Select value={medium} onValueChange={onMediumChange}>
            <SelectTrigger id="medium">
              <SelectValue placeholder="All Mediums" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mediums</SelectItem>
              {MEDIUM_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">Genre</Label>
          <Select value={genre} onValueChange={onGenreChange}>
            <SelectTrigger id="genre">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

