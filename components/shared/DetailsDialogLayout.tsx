"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SafeImage } from "@/components/ui/safe-image"
import { Loader2, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TabDefinition {
    id: string
    label: string
}

export interface DetailsDialogLayoutProps {
    // Dialog state
    open: boolean
    onOpenChange: (open: boolean) => void

    // Entity info
    title: string
    subtitle?: string
    isNewEntry: boolean
    entityTypeLabel: string // "Book", "Music", etc.
    placeholderIcon: React.ReactNode

    // Cover
    coverUrl?: string | null
    coverAspectRatio?: "square" | "portrait" // square for music, portrait for books
    onCoverUploadClick: () => void

    // Tabs
    tabs: TabDefinition[]
    activeTab: string
    onTabChange: (tab: string) => void

    // Actions
    loading: boolean
    onSubmit: () => void
    onDelete?: () => void
    showDelete: boolean
    submitLabel: string

    // Content
    children: React.ReactNode
}

export function DetailsDialogLayout({
    open,
    onOpenChange,
    title,
    subtitle,
    isNewEntry,
    entityTypeLabel,
    placeholderIcon,
    coverUrl,
    coverAspectRatio = "portrait",
    onCoverUploadClick,
    tabs,
    activeTab,
    onTabChange,
    loading,
    onSubmit,
    onDelete,
    showDelete,
    submitLabel,
    children,
}: DetailsDialogLayoutProps) {
    const coverHeightClass = coverAspectRatio === "square" ? "aspect-square" : "aspect-[2/3]"
    const mobileCoverSize = coverAspectRatio === "square" ? "w-12 h-12" : "w-10 h-14"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 h-[90vh] md:h-[85vh] flex flex-col gap-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden border-b bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                        <div className={cn(mobileCoverSize, "relative rounded overflow-hidden border shadow-sm bg-muted flex-shrink-0 group")}>
                            {coverUrl ? (
                                <SafeImage
                                    src={coverUrl}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-lg text-muted-foreground">
                                    {placeholderIcon}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="font-semibold text-base truncate h-auto leading-none">
                                {isNewEntry ? `Add New ${entityTypeLabel}` : title}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground truncate mt-1">
                                {subtitle || (isNewEntry ? `Add a new ${entityTypeLabel.toLowerCase()} to your library` : "")}
                            </DialogDescription>
                        </div>
                    </div>
                    {/* Horizontal Tabs */}
                    <div className="flex gap-1 mt-3 overflow-x-auto">
                        {tabs.map(tab => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-8 text-xs flex-shrink-0",
                                    activeTab === tab.id && "bg-secondary font-medium"
                                )}
                                onClick={() => onTabChange(tab.id)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:flex w-64 bg-muted/30 border-r flex-col p-5 gap-5 overflow-y-auto shrink-0">
                        {/* Cover */}
                        <div className={cn(coverHeightClass, "relative rounded-lg overflow-hidden border shadow-sm bg-muted self-center w-full group shrink-0")}>
                            {coverUrl ? (
                                <SafeImage
                                    src={coverUrl}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
                                    {placeholderIcon}
                                </div>
                            )}

                            {/* Quick upload overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:text-white hover:bg-white/20"
                                    onClick={onCoverUploadClick}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Change
                                </Button>
                            </div>
                        </div>

                        {/* Navigation Tabs (Vertical) */}
                        <div className="flex flex-col gap-1 w-full flex-1">
                            {tabs.map(tab => (
                                <Button
                                    key={tab.id}
                                    variant={activeTab === tab.id ? "secondary" : "ghost"}
                                    className={cn(
                                        "justify-start h-9 truncate",
                                        activeTab === tab.id && "bg-secondary font-medium"
                                    )}
                                    onClick={() => onTabChange(tab.id)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-full">
                        {/* Desktop Header */}
                        <DialogHeader className="hidden md:block px-6 py-4 border-b shrink-0">
                            <DialogTitle className="text-xl truncate" title={title}>
                                {isNewEntry ? `Add New ${entityTypeLabel}` : title}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">
                                {subtitle || (isNewEntry ? `Enter the details for the new ${entityTypeLabel.toLowerCase()}` : "")}
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="flex-1">
                            <div className="p-4 md:p-6">
                                {children}
                            </div>
                        </ScrollArea>

                        <DialogFooter className="border-t p-4 flex justify-between bg-muted/20 shrink-0 w-full z-10">
                            {showDelete && onDelete && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:hover:bg-red-950 dark:text-red-400"
                                    onClick={onDelete}
                                    disabled={loading}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            )}
                            <div className={cn("flex gap-2", !showDelete && "ml-auto")}>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button onClick={onSubmit} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {submitLabel}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
