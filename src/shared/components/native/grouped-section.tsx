import type { PropsWithChildren, ReactNode } from "react"
import type { StyleProp, TextStyle, ViewStyle } from "react-native"
import { Text, View } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface GroupedSectionProps extends PropsWithChildren {
  title?: string
  footer?: ReactNode
  cardStyle?: StyleProp<ViewStyle>
  titleStyle?: StyleProp<TextStyle>
  footerContainerStyle?: StyleProp<ViewStyle>
}

export function GroupedSection({
  title,
  footer,
  children,
  cardStyle,
  titleStyle,
  footerContainerStyle
}: GroupedSectionProps) {
  const { palette } = useAppTheme()

  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text
          selectable
          style={[
            {
              color: palette.textMuted,
              fontSize: 13,
              fontWeight: "600",
              paddingHorizontal: 4
            },
            titleStyle
          ]}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={[
          {
            backgroundColor: palette.surface,
            borderRadius: 18,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden"
          },
          cardStyle
        ]}
      >
        {children}
      </View>
      {footer ? (
        <View style={[{ paddingHorizontal: 4 }, footerContainerStyle]}>
          {typeof footer === "string" ? (
            <Text selectable style={{ color: palette.textMuted, fontSize: 12 }}>
              {footer}
            </Text>
          ) : (
            footer
          )}
        </View>
      ) : null}
    </View>
  )
}
