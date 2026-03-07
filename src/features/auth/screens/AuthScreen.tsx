import { useMemo, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/src/features/auth/hooks/useAuth"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { ScreenScrollView } from "@/src/shared/components/native/screen-scroll-view"
import { SegmentedSwitch } from "@/src/shared/components/workspace/SegmentedSwitch"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

type AuthMode = "login" | "signup"
type AuthStep = "email" | "otp"

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
  const insets = useSafeAreaInsets()
  const { requestOtp, verifyOtp } = useAuth()
  const { palette } = useAppTheme()
  const [mode, setMode] = useState<AuthMode>("login")
  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const messageTone = useMemo(() => getMessageTone(message), [message])

  const canVerifyOtp = step === "otp" && Boolean(otp.trim())
  const shouldRequestOtp = step === "email" || (step === "otp" && !otp.trim())
  const canSubmit = Boolean(email.trim()) && (shouldRequestOtp || canVerifyOtp)

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
      setMessage("Verification code sent to your email.")
    } catch (error) {
      setMessage(getDisplayMessage(error, "Unable to send code right now. Please try again."))
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
      const nextMessage = getDisplayMessage(error, "Unable to verify code right now. Please try again.")
      setMessage(nextMessage)
      if (nextMessage.toLowerCase().includes("request submitted")) {
        setStep("email")
        setMode("login")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <ScreenScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 + insets.bottom, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: palette.primary, fontSize: 14, fontWeight: "700", letterSpacing: 0.4 }}>
            ANALYTICS MOBILE
          </Text>
          <Text selectable style={{ color: palette.text, fontSize: 36, lineHeight: 40, fontWeight: "700", letterSpacing: -0.8 }}>
            {mode === "signup" ? "Request access" : "Welcome back"}
          </Text>
          <Text selectable style={{ color: palette.textMuted, fontSize: 15 }}>
            {mode === "signup"
              ? "Join the app with a quick approval request and email verification."
              : "Sign in with your email and a one-time verification code."}
          </Text>
        </View>

        <SegmentedSwitch<AuthMode>
          value={mode}
          onChange={switchMode}
          options={[
            { value: "login", label: "Login" },
            { value: "signup", label: "Request Access" }
          ]}
        />

        <GroupedSection title={step === "otp" ? "Verify your code" : "Email"}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: palette.textMuted, fontSize: 12, fontWeight: "600" }}>
                Email
              </Text>
              <TextInput
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: palette.border,
                  paddingHorizontal: 14,
                  color: palette.text,
                  backgroundColor: palette.surfaceMuted,
                  fontSize: 16
                }}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor={palette.textMuted as string}
              />
            </View>

            {step === "otp" ? (
              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: palette.textMuted, fontSize: 12, fontWeight: "600" }}>
                  Verification Code
                </Text>
                <TextInput
                  style={{
                    minHeight: 48,
                    borderRadius: 14,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: palette.border,
                    paddingHorizontal: 14,
                    color: palette.text,
                    backgroundColor: palette.surfaceMuted,
                    fontSize: 16
                  }}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  placeholder="6-digit code"
                  placeholderTextColor={palette.textMuted as string}
                />
              </View>
            ) : null}

            {message ? (
              <Text
                selectable
                style={{
                  color: messageTone === "success" ? palette.success : palette.danger,
                  fontSize: 13,
                  lineHeight: 18
                }}
              >
                {message}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => ({
                minHeight: 50,
                borderRadius: 16,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSubmit ? palette.primary : palette.surfaceRaised,
                opacity: pressed ? 0.88 : 1
              })}
              onPress={canVerifyOtp ? handleVerifyOtp : handleRequestOtp}
              disabled={loading || !canSubmit}
            >
              {loading ? (
                <ActivityIndicator color={palette.primaryText} />
              ) : (
                <Text selectable style={{ color: canSubmit ? palette.primaryText : palette.textMuted, fontSize: 17, fontWeight: "600" }}>
                  {canVerifyOtp
                    ? "Verify Code"
                    : step === "otp"
                      ? "Resend Code"
                      : mode === "signup"
                        ? "Request Access"
                        : "Send Code"}
                </Text>
              )}
            </Pressable>
          </View>
        </GroupedSection>
      </ScreenScrollView>
    </KeyboardAvoidingView>
  )
}
