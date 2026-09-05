import { createContext, useContext, useMemo } from "react"
import { useColorScheme, type ColorSchemeName } from "react-native"

export type AppTheme = {
  mode: "light" | "dark"
  isDark: boolean
  colors: {
    bg: string
    card: string
    surface: string
    border: string
    heading: string
    body: string
    muted: string
    input: string
    placeholder: string
    primary: string
    primarySoft: string
    success: string
    successSoft: string
    error: string
    errorSoft: string
  }
}

const LIGHT: AppTheme["colors"] = {
  bg: "#f8fafc", card: "#ffffff", surface: "#f1f5f9", border: "#e2e8f0",
  heading: "#0f172a", body: "#475569", muted: "#64748b", input: "#ffffff",
  placeholder: "#94a3b8", primary: "#3b82f6", primarySoft: "#eff6ff",
  success: "#16a34a", successSoft: "#f0fdf4", error: "#ef4444", errorSoft: "#fef2f2",
}

const DARK: AppTheme["colors"] = {
  bg: "#0f172a", card: "#172033", surface: "#202c40", border: "#334155",
  heading: "#f8fafc", body: "#cbd5e1", muted: "#94a3b8", input: "#111827",
  placeholder: "#64748b", primary: "#60a5fa", primarySoft: "#172554",
  success: "#4ade80", successSoft: "#14532d", error: "#f87171", errorSoft: "#450a0a",
}

const ThemeContext = createContext<AppTheme | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme()
  const mode = scheme === "dark" ? "dark" : "light"
  const value = useMemo<AppTheme>(() => ({ mode, isDark: mode === "dark", colors: mode === "dark" ? DARK : LIGHT }), [mode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error("useAppTheme must be used inside ThemeProvider")
  return theme
}

export function resolveThemeMode(scheme: ColorSchemeName): "light" | "dark" {
  return scheme === "dark" ? "dark" : "light"
}
