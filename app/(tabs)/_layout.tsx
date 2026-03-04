import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Redirect, Tabs } from "expo-router"
import { getSessionSnapshot } from "@/src/shared/api/session"

export default function TabsLayout() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    void getSessionSnapshot().then(({ session, status }) => {
      if (!mounted) return

      if (status !== "resolved" && typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn(`[auth] getSessionSnapshot returned ${status} in tabs layout`)
      }

      setAuthenticated(Boolean(session))
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  if (!authenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="media" options={{ title: "Media" }} />
      <Tabs.Screen name="food" options={{ title: "Food" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="ai" options={{ title: "AI" }} />
      <Tabs.Screen name="admin" options={{ title: "Admin" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" }
})
