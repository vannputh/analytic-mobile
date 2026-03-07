import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { ColorValue } from "react-native"
import { Appearance } from "react-native"

export type AppTheme = "system" | "light" | "dark"
type ResolvedTheme = "light" | "dark"

export interface ThemePalette {
  background: ColorValue
  surface: ColorValue
  surfaceMuted: ColorValue
  surfaceRaised: ColorValue
  border: ColorValue
  text: ColorValue
  textMuted: ColorValue
  primary: ColorValue
  primaryText: ColorValue
  success: ColorValue
  danger: ColorValue
  overlay: ColorValue
}

interface ThemeContextValue {
  theme: AppTheme
  resolvedTheme: ResolvedTheme
  palette: ThemePalette
  ready: boolean
  setTheme: (theme: AppTheme) => Promise<void>
  toggleTheme: () => Promise<void>
}

const LIGHT_PALETTE: ThemePalette = {
  background: "#f2f2f7",
  surface: "#ffffff",
  surfaceMuted: "#f7f7fc",
  surfaceRaised: "#e9e9ef",
  border: "#d1d1d6",
  text: "#111111",
  textMuted: "#6b7280",
  primary: "#0a84ff",
  primaryText: "#ffffff",
  success: "#34c759",
  danger: "#ff3b30",
  overlay: "rgba(15, 23, 42, 0.18)"
}

const DARK_PALETTE: ThemePalette = {
  background: "#000000",
  surface: "#1c1c1e",
  surfaceMuted: "#2c2c2e",
  surfaceRaised: "#3a3a3c",
  border: "#3a3a3c",
  text: "#f5f5f7",
  textMuted: "#a1a1aa",
  primary: "#0a84ff",
  primaryText: "#ffffff",
  success: "#32d74b",
  danger: "#ff453a",
  overlay: "rgba(15, 23, 42, 0.52)"
}

const THEME_PREF_KEY = "mobile-theme"
const FALLBACK_RESOLVED_THEME: ResolvedTheme = "light"

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
  return Appearance.getColorScheme() === "dark" ? "dark" : FALLBACK_RESOLVED_THEME
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<AppTheme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(getSystemTheme())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadTheme() {
      let stored: AppTheme | null = null
      try {
        const value = await AsyncStorage.getItem(THEME_PREF_KEY)
        stored = value === "system" || value === "light" || value === "dark" ? value : null
      } catch {
        stored = null
      }

      if (!mounted) return

      if (stored) {
        setThemeState(stored)
        setResolvedTheme(stored === "system" ? getSystemTheme() : stored)
      } else {
        setThemeState("system")
        setResolvedTheme(getSystemTheme())
      }
      setReady(true)
    }

    loadTheme()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (theme !== "system") return
      setResolvedTheme(colorScheme === "dark" ? "dark" : FALLBACK_RESOLVED_THEME)
    })

    return () => {
      subscription.remove()
    }
  }, [theme])

  async function persistTheme(next: AppTheme) {
    setThemeState(next)
    setResolvedTheme(next === "system" ? getSystemTheme() : next)
    try {
      await AsyncStorage.setItem(THEME_PREF_KEY, next)
    } catch {
      // Keep the in-memory selection even if local persistence fails.
    }
  }

  async function toggleTheme() {
    await persistTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      palette: resolvedTheme === "dark" ? DARK_PALETTE : LIGHT_PALETTE,
      ready,
      setTheme: persistTheme,
      toggleTheme
    }),
    [theme, resolvedTheme, ready]
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
