"use client"

import { Button } from "@/components/ui/button"
import { Film } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun } from "lucide-react"

interface NavbarProps {
  onRequestAccess: () => void
  onLogin: () => void
}

export function Navbar({ onRequestAccess, onLogin }: NavbarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Film className="h-5 w-5 text-primary/80" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              media review
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <Button
              variant="ghost"
              onClick={onLogin}
            >
              Login
            </Button>
            <Button
              onClick={onRequestAccess}
            >
              Request Access
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
