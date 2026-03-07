import type { PropsWithChildren } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface WorkspaceHeaderProps extends PropsWithChildren {
  badge: string
  title: string
  subtitle?: string
}

export function WorkspaceHeader({ badge, title, subtitle, children }: WorkspaceHeaderProps) {
  const { palette } = useAppTheme()

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text selectable style={[styles.badge, { color: palette.textMuted }]}>{badge.toUpperCase()}</Text>
        <Text selectable style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle ? <Text selectable style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  left: {
    gap: 2,
    flex: 1
  },
  badge: {
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: "600"
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.6
  },
  subtitle: {
    fontSize: 15
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  }
})
