import type { PropsWithChildren } from "react"
import { ScrollView, type ScrollViewProps } from "react-native"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

type ScreenScrollViewProps = PropsWithChildren<ScrollViewProps> & {
  padded?: boolean
}

export function ScreenScrollView({
  children,
  padded = true,
  contentContainerStyle,
  style,
  ...props
}: ScreenScrollViewProps) {
  const { palette } = useAppTheme()

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === "ios"}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={[{ flex: 1, backgroundColor: palette.background }, style]}
      contentContainerStyle={[
        padded && { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 16 },
        contentContainerStyle
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  )
}
