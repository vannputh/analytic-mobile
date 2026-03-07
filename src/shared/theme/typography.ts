import { Platform, type TextStyle } from "react-native"

export const MONO_FONT_FAMILY = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace"
})

export const MONO_LOWERCASE_TEXT: TextStyle = {
  fontFamily: MONO_FONT_FAMILY,
  textTransform: "lowercase"
}
