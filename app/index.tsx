import { useEffect, useState } from "react"
import { Redirect } from "expo-router"
import { ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "@/src/shared/api/supabase"

export default function IndexScreen() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthenticated(!!data.session)
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

  return authenticated ? <Redirect href="/(tabs)/media" /> : <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" }
})
