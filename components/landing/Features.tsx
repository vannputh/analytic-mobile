"use client"

import { Film, Sparkles, UtensilsCrossed } from "lucide-react"

const points = [
  {
    icon: Film,
    title: "one place for everything",
    body: "log films, shows, books, games, and podcasts in a single, quiet timeline.",
  },
  {
    icon: UtensilsCrossed,
    title: "moments, not metrics",
    body: "capture how something felt, not just when you finished it or what you rated it.",
  },
  {
    icon: Sparkles,
    title: "gentle ai help",
    body: "ask natural questions later—\"what comfort shows did i watch last winter?\"—without designing dashboards.",
  },
]

export function Features() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-3 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            why analytics
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            minimal, on purpose
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            no busy charts, no growth curves. just a calm, opinionated surface for keeping
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
