"use client"

import { Button } from "@/components/ui/button"

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
        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            remember the media
          </span>
          <br />
          you actually care about.
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
          analytics is a minimal logbook for films, shows, books, games, and podcasts—
          designed to feel more like a personal notebook than an analytics dashboard.
        </p>

        {/* CTA button */}
        <div className="flex items-center justify-center pt-8">
          <Button size="lg" className="px-8" onClick={onLogin}>
            get started
          </Button>
        </div>
      </div>
    </section>
  )
}
