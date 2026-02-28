import { useEffect, useRef, useState } from "react"
import { Redirect } from "expo-router"
import { Animated, Easing, Platform, StyleSheet, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "@/src/shared/api/supabase"

const OPENING_MIN_DURATION_MS = 1100
const MONO_FONT_FAMILY = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace"
})

export default function IndexScreen() {
  const [sessionResolved, setSessionResolved] = useState(false)
  const [requiresOpening, setRequiresOpening] = useState(false)
  const [openingDone, setOpeningDone] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const textOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const hasSession = !!data.session
      setAuthenticated(hasSession)
      if (!hasSession) {
        setRequiresOpening(true)
      }
      setSessionResolved(true)
    })

    return () => {
      mounted = false
    }
  }, [])

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

  if (!sessionResolved) {
    return <SafeAreaView style={styles.opening} />
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
    backgroundColor: "#ffffff"
  },
  brand: {
    color: "#000000",
    fontFamily: MONO_FONT_FAMILY,
    textTransform: "lowercase",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.2,
    fontWeight: "700"
  }
})
