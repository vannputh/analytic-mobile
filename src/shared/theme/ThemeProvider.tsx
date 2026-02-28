import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react"
import { Appearance } from "react-native"
import { getUserPreference, setUserPreference } from "@/src/shared/preferences/userPreferences"

export type AppTheme = "light" | "dark"

export interface ThemePalette {
  background: string
  surface: string
  surfaceMuted: string
  border: string
  text: string
  textMuted: string
  primary: string
  primaryText: string
  success: string
  danger: string
}

interface ThemeContextValue {
  theme: AppTheme
  palette: ThemePalette
  ready: boolean
  setTheme: (theme: AppTheme) => Promise<void>
  toggleTheme: () => Promise<void>
}

const LIGHT_PALETTE: ThemePalette = {
  background: "#f4f6f8",
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  border: "#d1d5db",
  text: "#0f172a",
  textMuted: "#475569",
  primary: "#0f172a",
  primaryText: "#ffffff",
  success: "#15803d",
  danger: "#b91c1c"
}

const DARK_PALETTE: ThemePalette = {
  background: "#0b1220",
  surface: "#111827",
  surfaceMuted: "#1f2937",
  border: "#334155",
  text: "#f8fafc",
  textMuted: "#cbd5e1",
  primary: "#f8fafc",
  primaryText: "#0f172a",
  success: "#22c55e",
  danger: "#ef4444"
}

const THEME_PREF_KEY = "mobile-theme"

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<AppTheme>("light")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadTheme() {
      const stored = await getUserPreference<AppTheme>(THEME_PREF_KEY)
      if (!mounted) return

      if (stored === "light" || stored === "dark") {
        setThemeState(stored)
      } else {
        const systemTheme = Appearance.getColorScheme() === "dark" ? "dark" : "light"
        setThemeState(systemTheme)
      }
      setReady(true)
    }

    loadTheme()
    return () => {
      mounted = false
    }
  }, [])

  async function persistTheme(next: AppTheme) {
    setThemeState(next)
    await setUserPreference(THEME_PREF_KEY, next)
  }

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    await persistTheme(next)
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      palette: theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE,
      ready,
      setTheme: persistTheme,
      toggleTheme
    }),
    [theme, ready]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider")
  }
  return context
}
