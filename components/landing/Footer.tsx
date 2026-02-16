"use client"

import { Film } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and tagline */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">media review</p>
              <p className="text-xs text-muted-foreground">
                A small, quiet tool for remembering what you’ve watched, read, and listened to.
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="text-center md:text-right space-y-1">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} media review
            </p>
            <p className="text-xs text-muted-foreground">
              No growth charts here. Just your own history.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
