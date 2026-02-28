import { useMemo, useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/src/features/auth/hooks/useAuth"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

type AuthMode = "login" | "signup"
type AuthStep = "email" | "otp"

const MONO_FONT_FAMILY = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace"
})

function getDisplayMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message.trim()
  if (!message) return fallback

  const lowered = message.toLowerCase()
  if (lowered.includes("typeerror") || lowered.includes("json")) {
    return fallback
  }

  return message
}

function getMessageTone(message: string | null): "success" | "error" {
  if (!message) return "error"
  const lowered = message.toLowerCase()
  if (lowered.includes("verification code sent") || lowered.includes("request submitted")) {
    return "success"
  }
  return "error"
}

export function AuthScreen() {
  const router = useRouter()
  const { theme } = useAppTheme()
  const { requestOtp, verifyOtp } = useAuth()
  const { height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<AuthMode>("login")
  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const messageTone = useMemo(() => getMessageTone(message), [message])
  const isDark = theme === "dark"
  const colors = useMemo(
    () => ({
      screenBackground: isDark ? "#000000" : "#ffffff",
      brandText: isDark ? "#ffffff" : "#000000",
      titleText: isDark ? "#000000" : "#ffffff",
      subtitleText: isDark ? "#6f6f6f" : "#9a9a9a",
      footerPromptText: isDark ? "#6f6f6f" : "#9c9c9c",
      inputFill: isDark ? "#f2f2f2" : "#121212",
      text: isDark ? "#111111" : "#f5f5f5",
      placeholder: isDark ? "#9a9a9a" : "#777777",
      messageFill: isDark ? "#f2f2f2" : "#121212",
      messageTextSuccess: isDark ? "#1a1a1a" : "#f5f5f5",
      messageTextError: isDark ? "#5a5a5a" : "#bdbdbd",
      cardFill: isDark ? "#ffffff" : "#000000",
      buttonFill: isDark ? "#1f1f1f" : "#f3f3f3",
      buttonText: isDark ? "#f5f5f5" : "#111111",
      linkText: isDark ? "#111111" : "#f9fafb",
      glassShadow: "#000000"
    }),
    [isDark]
  )

  const canVerifyOtp = step === "otp" && Boolean(otp.trim())
  const shouldRequestOtp = step === "email" || (step === "otp" && !otp.trim())
  const canSubmit = Boolean(email.trim()) && (shouldRequestOtp || canVerifyOtp)
  const pageTitle = mode === "signup" ? "request access" : "login"
  const halfCardHeight = Math.round(screenHeight * 0.5)

  const primaryActionLabel = useMemo(() => {
    if (canVerifyOtp) {
      return loading ? "verifying otp..." : "verify otp"
    }

    if (step === "otp") {
      return loading ? "resending otp..." : "resend otp"
    }

    if (mode === "signup") {
      return loading ? "requesting otp..." : "request otp"
    }

    return loading ? "sending otp..." : "send otp"
  }, [canVerifyOtp, loading, mode, step])

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setStep("email")
    setOtp("")
    setMessage(null)
  }

  async function handleRequestOtp() {
    setLoading(true)
    setMessage(null)
    try {
      await requestOtp(email.trim(), mode === "signup")
      setStep("otp")
      setMessage("verification code sent to your email")
    } catch (error) {
      setMessage(getDisplayMessage(error, "unable to send code right now. please try again."))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    setLoading(true)
    setMessage(null)
    try {
      await verifyOtp(email.trim(), otp.trim(), mode === "signup")
      router.replace("/(tabs)/media")
    } catch (error) {
      const msg = getDisplayMessage(error, "unable to verify code right now. please try again.")
      setMessage(msg)
      if (msg.toLowerCase().includes("request submitted")) {
        setStep("email")
        setMode("login")
      }
    } finally {
      setLoading(false)
    }
  }

  const formContent = (
    <View style={styles.glassContent}>
      <View style={[styles.fieldStack, styles.emailFieldLift]}>
        <Text style={[styles.label, styles.mono, { color: colors.subtitleText }]}>email</Text>
        <View style={[styles.inputShell, { backgroundColor: colors.inputFill }]}>
          <TextInput
            style={[styles.input, styles.mono, { color: colors.text }]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      </View>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: colors.buttonFill
          },
          (!canSubmit || loading) && styles.buttonDisabled
        ]}
        onPress={canVerifyOtp ? handleVerifyOtp : handleRequestOtp}
        disabled={loading || !canSubmit}
      >
        <View style={styles.buttonContent}>
          {loading ? <ActivityIndicator color={colors.buttonText} size="small" /> : <Ionicons name="key-outline" size={15} color={colors.buttonText} />}
          <Text style={[styles.buttonText, styles.mono, { color: colors.buttonText }]}>{primaryActionLabel}</Text>
        </View>
      </Pressable>
    </View>
  )

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <KeyboardAvoidingView style={[styles.flex, styles.layoutFrame]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.content}>
          <View style={styles.topSection}>
            <View style={styles.topSectionInner}>
              <View style={styles.brandTopSpacer} />
              <Text style={[styles.heroText, styles.brandHeader, styles.mono, { color: colors.brandText }]}>analytics</Text>
              <View style={styles.brandBottomSpacer} />
            </View>
          </View>

          <View
            style={[
              styles.glassCardShell,
              styles.bottomCardShell,
              { shadowColor: colors.glassShadow, height: halfCardHeight, backgroundColor: colors.cardFill, paddingBottom: 18 + insets.bottom }
            ]}
          >
            <View style={styles.titleBlock}>
              <Text style={[styles.heroText, styles.title, styles.mono, { color: colors.titleText }]}>{pageTitle}</Text>
            </View>

            <View style={styles.middleContent}>
              <View style={styles.formSection}>{formContent}</View>

              {step === "otp" && (
                <View style={styles.fieldStack}>
                  <Text style={[styles.label, styles.mono, { color: colors.subtitleText }]}>verification code</Text>
                  <View style={[styles.inputShell, { backgroundColor: colors.inputFill }]}>
                    <TextInput
                      style={[styles.input, styles.mono, { color: colors.text }]}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      placeholder="enter 6-digit code"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
              )}

              {message ? (
                <View
                  style={[
                    styles.message,
                    {
                      backgroundColor: colors.messageFill
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      styles.mono,
                      { color: messageTone === "success" ? colors.messageTextSuccess : colors.messageTextError }
                    ]}
                  >
                    {message.toLowerCase()}
                  </Text>
                </View>
              ) : null}

              {step === "otp" && (
                <Pressable onPress={() => setStep("email")} style={styles.secondaryAction}>
                  <Text style={[styles.secondaryText, styles.mono, { color: colors.subtitleText }]}>use another email</Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={() => switchMode(mode === "login" ? "signup" : "login")} style={styles.footerRow}>
              <Text style={[styles.footerPrompt, styles.mono, { color: colors.footerPromptText }]}>
                {mode === "login" ? "don't have access?" : "already approved?"}
              </Text>
              <Text style={[styles.footerLink, styles.mono, { color: colors.linkText }]}>
                {mode === "login" ? "request access" : "login"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  flex: {
    flex: 1
  },
  mono: {
    fontFamily: MONO_FONT_FAMILY,
    textTransform: "lowercase"
  },
  layoutFrame: {
    alignItems: "center"
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 420
  },
  topSection: {
    flex: 1,
    width: "100%"
  },
  topSectionInner: {
    flex: 1,
    width: "100%"
  },
  brandTopSpacer: {
    flex: 1
  },
  brandBottomSpacer: {
    flex: 2
  },
  heroText: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.2,
    fontWeight: "700"
  },
  brandHeader: {
    alignSelf: "center"
  },
  title: {
    alignSelf: "flex-start"
  },
  formSection: {
    gap: 18,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    paddingTop: 0
  },
  titleBlock: {
    alignItems: "flex-start",
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    gap: 2,
    marginBottom: 8,
    paddingTop: 18
  },
  middleContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    gap: 12
  },
  fieldStack: {
    gap: 12,
    width: "100%",
    alignSelf: "center"
  },
  emailFieldLift: {
    transform: [{ translateY: -12 }]
  },
  glassCardShell: {
    borderRadius: 26,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 26,
    elevation: 9
  },
  bottomCardShell: {
    width: "100%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginTop: "auto",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18
  },
  glassContent: {
    gap: 22,
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    textAlign: "left"
  },
  inputShell: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%"
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    fontSize: 14,
    lineHeight: 18
  },
  message: {
    borderRadius: 14,
    width: "100%",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  messageText: {
    fontSize: 11,
    lineHeight: 16
  },
  button: {
    minHeight: 46,
    width: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1
  },
  secondaryAction: {
    alignItems: "center",
    paddingTop: 4
  },
  secondaryText: {
    fontSize: 11,
    lineHeight: 14
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 10
  },
  footerPrompt: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2
  },
  footerLink: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600"
  }
})
