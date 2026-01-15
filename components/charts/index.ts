/**
 * Shared chart components and configuration
 * 
 * Usage:
 * import { CHART_COLORS, tooltipStyle, SimpleBarChart } from "@/components/charts"
 */

// Configuration exports
export {
    CHART_COLORS,
    TREEMAP_COLORS,
    ACCENT_COLOR,
    tooltipStyle,
    axisStyle,
    gridStyle,
    tickStyle,
    formatMonthLabel,
    formatCurrency,
    formatNumber,
    emptyStateClass,
} from "./chart-config"

// Component exports (will be added as we create them)
export { SimpleBarChart } from "./SimpleBarChart"
export { SimplePieChart } from "./SimplePieChart"
export { AreaChartBase } from "./AreaChartBase"
