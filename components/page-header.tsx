"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { Plus, LogOut, Film, Utensils } from "lucide-react"
import { toast } from "sonner"

// Dynamic imports for dialog components - reduces initial bundle size
const MediaDetailsDialog = dynamic(
  () => import("@/components/media-details-dialog").then(m => m.MediaDetailsDialog),
  { ssr: false }
)
const FoodAddDialog = dynamic(
  () => import("@/components/food-add-dialog").then(m => m.FoodAddDialog),
  { ssr: false }
)

const WORKSPACES = {
  movies: { label: "Media", icon: Film, path: "/movies" },
  food: { label: "Food & Drinks", icon: Utensils, path: "/food" },
} as const

type WorkspaceKey = keyof typeof WORKSPACES

interface PageHeaderProps {
  title: string
  /** When on food workspace, opening Add uses this instead of the header's own dialog (single dialog, can receive calendar date). */
  openFoodAddDialog?: (initialDate?: string) => void
  /** Called when media is created/updated via the header dialog (e.g. so list page can refresh entries). */
  onMediaAdded?: () => void
}

export function PageHeader({ title, openFoodAddDialog, onMediaAdded }: PageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showMediaDialog, setShowMediaDialog] = useState(false)
  const [showFoodDialog, setShowFoodDialog] = useState(false)

  // Determine current workspace from URL
  const currentWorkspaceKey = (Object.keys(WORKSPACES).find(key =>
    pathname?.startsWith(`/${key}`)
  ) || "movies") as WorkspaceKey

  const currentWorkspace = WORKSPACES[currentWorkspaceKey]
  const CurrentIcon = currentWorkspace.icon

  const isDiaryPage = pathname === currentWorkspace.path
  const isAnalyticsPage = pathname === `${currentWorkspace.path}/analytics`

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const targetWorkspace = currentWorkspaceKey === "movies" ? "food" : "movies"
              router.push(`${WORKSPACES[targetWorkspace].path}/analytics`)
            }}
            className="h-8 w-8"
          >
            <CurrentIcon className="h-4 w-4" />
            <span className="sr-only">{currentWorkspace.label}</span>
          </Button>
          <span className="text-muted-foreground">/</span>
          {isDiaryPage ? (
            <Link
              href={`${currentWorkspace.path}/analytics`}
              className="text-xs sm:text-sm font-mono uppercase tracking-wider hover:underline"
            >
              diary
            </Link>
          ) : isAnalyticsPage ? (
            <Link
              href={currentWorkspace.path}
              className="text-xs sm:text-sm font-mono uppercase tracking-wider hover:underline"
            >
              analytics
            </Link>
          ) : (
            <h1 className="text-xs sm:text-sm font-mono uppercase tracking-wider">{title}</h1>
          )}
        </div>

        {/* Right side: Navigation buttons */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {/* Add Button Logic */}
          {currentWorkspaceKey === "movies" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMediaDialog(true)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add</span>
            </Button>
          )}

          {currentWorkspaceKey === "food" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (openFoodAddDialog ? openFoodAddDialog() : setShowFoodDialog(true))}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add</span>
            </Button>
          )}

          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
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
          onMediaAdded?.()
        }}
      />
      {!(currentWorkspaceKey === "food" && openFoodAddDialog) && (
        <FoodAddDialog
          open={showFoodDialog}
          onOpenChange={setShowFoodDialog}
          onSuccess={() => {
            setShowFoodDialog(false)
            router.refresh()
          }}
          initialDate={new Date().toISOString()}
        />
      )}
    </header>
  )
}

