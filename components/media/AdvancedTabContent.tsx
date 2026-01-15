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
import { CreateEntryInput } from "@/lib/actions";

interface AdvancedTabContentProps {
    formData: Partial<CreateEntryInput>;
    onFormChange: (data: Partial<CreateEntryInput>) => void;
    dropdownOptions: {
        types: string[];
        languages: string[];
    };
}

export function AdvancedTabContent({
    formData,
    onFormChange,
    dropdownOptions,
}: AdvancedTabContentProps) {
    const setField = <K extends keyof CreateEntryInput>(
        key: K,
        value: CreateEntryInput[K]
    ) => {
        onFormChange({ ...formData, [key]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
                <Label>Type</Label>
                <Select
                    value={formData.type || undefined}
                    onValueChange={(val) => setField("type", val)}
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
                    onChange={(e) => setField("season", e.target.value)}
                    placeholder="e.g. Season 1, 2024"
                />
            </div>

            {/* Length/Duration */}
            <div className="space-y-2">
                <Label>Length / Duration</Label>
                <Input
                    value={formData.length || ""}
                    onChange={(e) => setField("length", e.target.value)}
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
                    onChange={(e) => setField("price", e.target.value ? parseFloat(e.target.value) : null)}
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
                    onChange={(e) => setField("average_rating", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 8.5"
                />
            </div>

            {/* Language - Dropdown */}
            <div className="col-span-full space-y-2">
                <Label>Language</Label>
                <Select
                    value={formData.language?.[0] || undefined}
                    onValueChange={(val) => setField("language", [val])}
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
                    onChange={(e) => setField("genre", e.target.value.split(",").map(g => g.trim()).filter(Boolean))}
                    placeholder="Action, Drama, Comedy"
                />
                <p className="text-xs text-muted-foreground">Separate multiple genres with commas</p>
            </div>
        </div>
    );
}
