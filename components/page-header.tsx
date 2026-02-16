"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { Plus, Film, Utensils, Sparkles } from "lucide-react"
import { ProfileDropdown } from "@/components/profile"

// Dynamic imports for dialog components - reduces initial bundle size
const MediaDetailsDialog = dynamic(
  () => import("@/components/media-details-dialog").then(m => m.MediaDetailsDialog),
  { ssr: false }
)
const FoodAddDialog = dynamic(
  () => import("@/components/food-add-dialog").then(m => m.FoodAddDialog),
  { ssr: false }
)
const AIQueryDialog = dynamic(
  () => import("@/components/ai-query-dialog").then(m => m.AIQueryDialog),
  { ssr: false }
)

const WORKSPACES = {
  media: { label: "Media", icon: Film, path: "/media" },
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
  const [showAIQueryDialog, setShowAIQueryDialog] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single()
        
        if (profile?.is_admin) {
          setIsAdmin(true)
        }
      }
    }
    checkAdmin()
  }, [])

  // Determine current workspace from URL
  const currentWorkspaceKey = (Object.keys(WORKSPACES).find(key =>
    pathname?.startsWith(`/${key}`)
  ) || "media") as WorkspaceKey

  const currentWorkspace = WORKSPACES[currentWorkspaceKey]
  const CurrentIcon = currentWorkspace.icon

  // Map workspace key to AI query workspace type
  const aiWorkspace = currentWorkspaceKey === "media" ? "media" : "food"

  const isDiaryPage = pathname === currentWorkspace.path
  const isAnalyticsPage = pathname === `${currentWorkspace.path}/analytics`

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
        {/* Left side: Workspace Switcher + Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const targetWorkspace = currentWorkspaceKey === "media" ? "food" : "media"
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
          {/* AI Query Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAIQueryDialog(true)}
            className="h-8 w-8"
          >
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">AI Assistant</span>
          </Button>

          {/* Add Button Logic */}
          {currentWorkspaceKey === "media" && (
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
          <ProfileDropdown isAdmin={isAdmin} />
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
      <AIQueryDialog
        open={showAIQueryDialog}
        onOpenChange={setShowAIQueryDialog}
        workspace={aiWorkspace}
      />
    </header>
  )
}

