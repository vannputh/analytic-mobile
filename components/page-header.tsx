"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { Table2, BarChart3, Plus, LogOut } from "lucide-react"
import { toast } from "sonner"

interface PageHeaderProps {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

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
        <h1 className="text-xs sm:text-sm font-mono uppercase tracking-wider">{title}</h1>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <Button
            variant={pathname === "/analytics" ? "default" : "outline"}
            size="sm"
            asChild
            className="px-2 sm:px-3"
          >
            <Link href="/analytics">
              <BarChart3 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>
          </Button>
          <Button
            variant={pathname === "/entries" ? "default" : "outline"}
            size="sm"
            asChild
            className="px-2 sm:px-3"
          >
            <Link href="/entries">
              <Table2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Entries</span>
            </Link>
          </Button>
          <Button
            variant={pathname === "/add" ? "default" : "outline"}
            size="sm"
            asChild
            className="px-2 sm:px-3"
          >
            <Link href="/add">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Link>
          </Button>
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
    </header>
  )
}

