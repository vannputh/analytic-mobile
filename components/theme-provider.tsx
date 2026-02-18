"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    // Check localStorage and system preference, but be defensive in restricted contexts
    try {
      if (typeof window === "undefined") return

      const stored = window.localStorage
        ? (window.localStorage.getItem("theme") as Theme | null)
        : null

      const systemTheme =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"

      const initialTheme = stored || systemTheme
      setThemeState(initialTheme)
      document.documentElement.classList.toggle("dark", initialTheme === "dark")
    } catch {
      // Storage or matchMedia not available (e.g. private mode, iframe, or restricted context)
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("theme", newTheme)
      }
    } catch {
      // Ignore storage errors and still update the DOM class
    }
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
