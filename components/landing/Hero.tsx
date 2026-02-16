"use client"

import { Button } from "@/components/ui/button"
import { Film, TrendingUp, Sparkles } from "lucide-react"

interface HeroProps {
  onRequestAccess: () => void
  onLogin: () => void
}

export function Hero({ onRequestAccess, onLogin }: HeroProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          A quiet place for everything you watch, read, and listen to
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Remember the media
          </span>
          <br />
          you actually care about.
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
          Media Review is a minimal logbook for films, shows, books, games, and podcasts—
          designed to feel more like a personal notebook than an analytics dashboard.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Button 
            size="lg" 
            onClick={onRequestAccess}
            className="w-full sm:w-auto px-8"
          >
            Request access
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={onLogin}
            className="w-full sm:w-auto px-8"
          >
            Log in
          </Button>
        </div>

        {/* Small note */}
        <p className="pt-10 text-xs text-muted-foreground">
          No charts on the front page. Just a clean, focused space to remember what moved you.
        </p>
      </div>
    </section>
  )
}
