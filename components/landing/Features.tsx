"use client"

import { Film, Sparkles, UtensilsCrossed } from "lucide-react"

const points = [
  {
    icon: Film,
    title: "One place for everything",
    body: "Log films, shows, books, games, and podcasts in a single, quiet timeline.",
  },
  {
    icon: UtensilsCrossed,
    title: "Moments, not metrics",
    body: "Capture how something felt, not just when you finished it or what you rated it.",
  },
  {
    icon: Sparkles,
    title: "Gentle AI help",
    body: "Ask natural questions later—\"what comfort shows did I watch last winter?\"—without designing dashboards.",
  },
]

export function Features() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-3 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Why analytics
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Minimal, on purpose
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            No busy charts, no growth curves. Just a calm, opinionated surface for keeping
            track of the media that actually matters to you.
          </p>
        </div>

        <div className="space-y-6">
          {points.map((point) => (
            <div key={point.title} className="flex gap-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                <point.icon className="h-4 w-4 text-primary/80" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm md:text-base font-medium">{point.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {point.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
