"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { Table2, Upload, BarChart3, Plus, LogOut } from "lucide-react"
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
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-sm font-mono uppercase tracking-wider">{title}</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant={pathname === "/analytics" ? "default" : "outline"} 
            size="sm" 
            asChild
          >
            <Link href="/analytics">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </Link>
          </Button>
          <Button 
            variant={pathname === "/entries" ? "default" : "outline"} 
            size="sm" 
            asChild
          >
            <Link href="/entries">
              <Table2 className="h-4 w-4 mr-1.5" />
              All Entries
            </Link>
          </Button>
          <Button 
            variant={pathname === "/add" ? "default" : "outline"} 
            size="sm" 
            asChild
          >
            <Link href="/add">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Link>
          </Button>
          <Button 
            variant={pathname === "/import" ? "default" : "outline"} 
            size="sm" 
            asChild
          >
            <Link href="/import">
              <Upload className="h-4 w-4 mr-1.5" />
              Import
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

