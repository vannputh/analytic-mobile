"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { User, LogOut, Shield, Sun, Moon } from "lucide-react"
import { toast } from "sonner"

interface ProfileDropdownProps {
  isAdmin?: boolean
}

export function ProfileDropdown({ isAdmin }: ProfileDropdownProps) {
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error("Failed to logout")
    } else {
      router.push("/login")
      router.refresh()
    }
  }

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.classList.toggle("dark", newIsDark)
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("theme", newIsDark ? "dark" : "light")
      }
    } catch {
      // Storage not available (e.g. private mode, iframe, or restricted context)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black text-white hover:bg-black/80">
        <User className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black text-white hover:bg-black/80">
          <User className="h-4 w-4" />
          <span className="sr-only">Profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-xs">
          <div className="flex flex-col space-y-1">
            <p className="text-xs text-muted-foreground truncate">{email}</p>
            {isAdmin && (
              <div className="flex items-center gap-1 text-primary">
                <Shield className="h-3 w-3" />
                <span className="text-xs">Admin</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/admin")}
              className="font-mono text-xs cursor-pointer"
            >
              <Shield className="mr-2 h-3 w-3" />
              Admin Panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {mounted && (
          <DropdownMenuItem
            onClick={toggleTheme}
            className="font-mono text-xs cursor-pointer"
          >
            {isDark ? (
              <Sun className="mr-2 h-3 w-3" />
            ) : (
              <Moon className="mr-2 h-3 w-3" />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="font-mono text-xs cursor-pointer"
        >
          <LogOut className="mr-2 h-3 w-3" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
