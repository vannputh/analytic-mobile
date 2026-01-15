/**
 * Shared chart configuration for consistent styling across all analytics charts
 */

// Monochrome palette with better spread for readability
export const CHART_COLORS = [
    "hsl(0, 0%, 15%)", // Very dark
    "hsl(0, 0%, 30%)",
    "hsl(0, 0%, 45%)",
    "hsl(0, 0%, 60%)",
    "hsl(0, 0%, 75%)",
    "hsl(0, 0%, 85%)", // Very light
    "hsl(0, 0%, 40%)",
    "hsl(0, 0%, 55%)",
] as const

// Darker palette for treemaps (better white text visibility)
export const TREEMAP_COLORS = [
    "hsl(0, 0%, 15%)",
    "hsl(0, 0%, 25%)",
    "hsl(0, 0%, 35%)",
    "hsl(0, 0%, 45%)",
    "hsl(0, 0%, 55%)",
] as const

export const ACCENT_COLOR = "hsl(0, 0%, 10%)"

// Custom tooltip style shared across all charts
export const tooltipStyle = {
    backgroundColor: "hsl(0, 0%, 98%)",
    border: "1px solid hsl(0, 0%, 90%)",
    borderRadius: "4px",
    padding: "8px 12px",
    fontSize: "11px",
    fontFamily: "monospace",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
} as const

// Axis styling
export const axisStyle = {
    stroke: "hsl(0, 0%, 80%)",
} as const

export const gridStyle = {
    strokeDasharray: "3 3",
    stroke: "hsl(0, 0%, 90%)",
} as const

// Chart axis tick styling
export const tickStyle = {
    fontSize: 9,
    fontFamily: "monospace",
} as const

// Format month label from "YYYY-MM" to "Jan 23" format
export function formatMonthLabel(month: string): string {
    const [year, m] = month.split("-")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${monthNames[parseInt(m, 10) - 1]} ${year.slice(2)}`
}

// Format currency values
export function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString()}`
}

// Format numbers with locale formatting
export function formatNumber(num: number): string {
    return num.toLocaleString()
}

// Empty state component styling
export const emptyStateClass = "h-64 flex items-center justify-center text-muted-foreground text-sm font-mono"
