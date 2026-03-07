import { useEffect, useRef, useState } from "react"
import { Redirect } from "expo-router"
import { ActivityIndicator, Animated, Easing, StyleSheet, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/src/features/auth/hooks/useAuth"
import { MONO_FONT_FAMILY } from "@/src/shared/theme/typography"

const OPENING_MIN_DURATION_MS = 1100

export default function IndexScreen() {
  const { loading, session } = useAuth()
  const [requiresOpening, setRequiresOpening] = useState(false)
  const [openingDone, setOpeningDone] = useState(false)
  const textOpacity = useRef(new Animated.Value(0)).current
  const authenticated = Boolean(session)

  useEffect(() => {
    if (loading) return

    setRequiresOpening(!authenticated)
    if (authenticated) {
      setOpeningDone(true)
    }
  }, [authenticated, loading])

  useEffect(() => {
    if (!requiresOpening) return

    const timer = setTimeout(() => {
      setOpeningDone(true)
    }, OPENING_MIN_DURATION_MS)
    return () => clearTimeout(timer)
  }, [requiresOpening])

  useEffect(() => {
    if (!requiresOpening) return

    textOpacity.setValue(0)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(textOpacity, {
          toValue: 0.55,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    )

    animation.start()
    return () => animation.stop()
  }, [requiresOpening, textOpacity])

  if (loading) {
    return (
      <SafeAreaView style={styles.opening}>
        <Text style={styles.brand}>analytic</Text>
        <ActivityIndicator color="#000000" style={styles.spinner} />
      </SafeAreaView>
    )
  }

  if (requiresOpening && !openingDone) {
    return (
      <SafeAreaView style={styles.opening}>
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.brand}>analytic</Text>
        </Animated.View>
      </SafeAreaView>
    )
  }

  return authenticated ? <Redirect href="/(tabs)/media" /> : <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  opening: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    gap: 16
  },
  brand: {
    color: "#000000",
    fontFamily: MONO_FONT_FAMILY,
    textTransform: "lowercase",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.2,
    fontWeight: "700"
  },
  spinner: {
    marginTop: 4
  }
})
