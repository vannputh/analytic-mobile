import * as Haptics from "expo-haptics"
import SegmentedControl from "@react-native-segmented-control/segmented-control"
import type { FontStyle } from "@react-native-segmented-control/segmented-control"
import type { ViewStyle } from "react-native"

export interface NativeSegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface NativeSegmentedControlProps<T extends string> {
  value: T
  options: NativeSegmentedControlOption<T>[]
  onChange: (next: T) => void
  appearance?: "dark" | "light"
  backgroundColor?: string
  tintColor?: string
  fontStyle?: FontStyle
  activeFontStyle?: FontStyle
  tabStyle?: ViewStyle
  sliderStyle?: ViewStyle
  style?: ViewStyle
}

export function NativeSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  appearance,
  backgroundColor,
  tintColor,
  fontStyle,
  activeFontStyle,
  tabStyle,
  sliderStyle,
  style
}: NativeSegmentedControlProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )

  return (
    <SegmentedControl
      appearance={appearance}
      backgroundColor={backgroundColor}
      tintColor={tintColor}
      fontStyle={fontStyle}
      activeFontStyle={activeFontStyle}
      tabStyle={tabStyle}
      sliderStyle={sliderStyle}
      style={style}
      values={options.map((option) => option.label)}
      selectedIndex={selectedIndex}
      onChange={({ nativeEvent }) => {
        const next = options[nativeEvent.selectedSegmentIndex]
        if (!next) return
        void Haptics.selectionAsync().catch(() => undefined)
        onChange(next.value)
      }}
    />
  )
}
