"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { Table2, BarChart3, Plus, LogOut, Film, Book, Music, Utensils, ChevronDown, Check, Calendar } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Dynamic imports for dialog components - reduces initial bundle size
const BookDetailsDialog = dynamic(
  () => import("@/components/book-details-dialog").then(m => m.BookDetailsDialog),
  { ssr: false }
)
const MusicDetailsDialog = dynamic(
  () => import("@/components/music-details-dialog").then(m => m.MusicDetailsDialog),
  { ssr: false }
)
const MediaDetailsDialog = dynamic(
  () => import("@/components/media-details-dialog").then(m => m.MediaDetailsDialog),
  { ssr: false }
)
const FoodAddDialog = dynamic(
  () => import("@/components/food-add-dialog").then(m => m.FoodAddDialog),
  { ssr: false }
)

const WORKSPACES = {
  movies: { label: "Movies & TV", icon: Film, path: "/movies" },
  books: { label: "Books", icon: Book, path: "/books" },
  music: { label: "Music", icon: Music, path: "/music" },
  food: { label: "Food & Drinks", icon: Utensils, path: "/food" },
} as const

type WorkspaceKey = keyof typeof WORKSPACES

interface PageHeaderProps {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showBookDialog, setShowBookDialog] = useState(false)
  const [showMusicDialog, setShowMusicDialog] = useState(false)
  const [showMediaDialog, setShowMediaDialog] = useState(false)
  const [showFoodDialog, setShowFoodDialog] = useState(false)

  // Determine current workspace from URL
  const currentWorkspaceKey = (Object.keys(WORKSPACES).find(key =>
    pathname?.startsWith(`/${key}`)
  ) || "movies") as WorkspaceKey

  const currentWorkspace = WORKSPACES[currentWorkspaceKey]
  const CurrentIcon = currentWorkspace.icon

  const handleLogout = async () => {
    const supabaseClient = createClient()
    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      toast.error("Failed to logout")
    } else {
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
        {/* Left side: Workspace Switcher + Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 px-2 sm:px-3">
                <CurrentIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">{currentWorkspace.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[160px]">
              {Object.entries(WORKSPACES).map(([key, ws]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => router.push(`${ws.path}/analytics`)}
                  className="gap-2"
                >
                  <ws.icon className="h-4 w-4" />
                  {ws.label}
                  {currentWorkspaceKey === key && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xs sm:text-sm font-mono uppercase tracking-wider">{title}</h1>
        </div>

        {/* Right side: Navigation buttons */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <Button
            variant={pathname?.includes("/analytics") ? "default" : "outline"}
            size="sm"
            asChild
            className="px-2 sm:px-3"
          >
            <Link href={`${currentWorkspace.path}/analytics`}>
              <BarChart3 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>
          </Button>
          <Button
            variant={pathname === currentWorkspace.path ? "default" : "outline"}
            size="sm"
            asChild
            className="px-2 sm:px-3"
          >
            <Link href={currentWorkspace.path}>
              {currentWorkspaceKey === "food" ? (
                <Calendar className="h-4 w-4 sm:mr-1.5" />
              ) : (
                <Table2 className="h-4 w-4 sm:mr-1.5" />
              )}
              <span className="hidden sm:inline">{currentWorkspaceKey === "food" ? "Calendar" : "Entries"}</span>
            </Link>
          </Button>

          {/* Add Button Logic */}
          {currentWorkspaceKey === "movies" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMediaDialog(true)}
              className="px-2 sm:px-3"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}

          {currentWorkspaceKey === "books" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBookDialog(true)}
              className="px-2 sm:px-3"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}

          {currentWorkspaceKey === "music" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMusicDialog(true)}
              className="px-2 sm:px-3"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}

          {currentWorkspaceKey === "food" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFoodDialog(true)}
              className="px-2 sm:px-3"
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}

          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <MediaDetailsDialog
        open={showMediaDialog}
        onOpenChange={setShowMediaDialog}
        entry={null}
        onSuccess={() => {
          setShowMediaDialog(false)
          router.refresh()
        }}
      />
      <BookDetailsDialog
        open={showBookDialog}
        onOpenChange={setShowBookDialog}
        entry={null}
        onSuccess={() => {
          setShowBookDialog(false)
          router.refresh()
        }}
      />
      <MusicDetailsDialog
        open={showMusicDialog}
        onOpenChange={setShowMusicDialog}
        entry={null}
        onSuccess={() => {
          setShowMusicDialog(false)
          router.refresh()
        }}
      />
      <FoodAddDialog
        open={showFoodDialog}
        onOpenChange={setShowFoodDialog}
        onSuccess={() => {
          setShowFoodDialog(false)
          router.refresh()
        }}
        initialDate={new Date().toISOString()}
      />
    </header>
  )
}

