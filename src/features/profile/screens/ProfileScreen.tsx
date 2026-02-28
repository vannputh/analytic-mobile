import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { supabase } from "@/src/shared/api/supabase"
import { useAuth } from "@/src/features/auth/hooks/useAuth"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

interface ProfileState {
  email: string
  status: "pending" | "approved" | "rejected" | "unknown"
  isAdmin: boolean
}

export function ProfileScreen() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { theme, palette, toggleTheme, ready } = useAppTheme()
  const [profile, setProfile] = useState<ProfileState>({
    email: "",
    status: "unknown",
    isAdmin: false
  })

  useEffect(() => {
    let mounted = true
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user || !mounted) return

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("status,is_admin")
        .eq("user_id", user.id)
        .single()

      if (!mounted) return

      setProfile({
        email: user.email ?? "",
        status: (profileData?.status as ProfileState["status"]) ?? "unknown",
        isAdmin: Boolean(profileData?.is_admin)
      })
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>Profile</Text>
        <Text style={[styles.label, { color: palette.textMuted }]}>Email</Text>
        <Text style={[styles.value, { color: palette.text }]}>{profile.email || "No user"}</Text>

        <Text style={[styles.label, { color: palette.textMuted }]}>Access</Text>
        <Text style={[styles.value, { color: palette.text }]}>{profile.status}</Text>

        <Text style={[styles.label, { color: palette.textMuted }]}>Role</Text>
        <Text style={[styles.value, { color: palette.text }]}>{profile.isAdmin ? "Admin" : "User"}</Text>

        <Pressable
          style={[styles.buttonSecondary, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}
          onPress={toggleTheme}
          disabled={!ready}
        >
          <Text style={[styles.buttonSecondaryText, { color: palette.text }]}>
            Theme: {theme === "dark" ? "Dark" : "Light"} (Tap to toggle)
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: palette.primary }]}
          onPress={async () => {
            await signOut()
            router.replace("/(auth)/login")
          }}
        >
          <Text style={[styles.buttonText, { color: palette.primaryText }]}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  buttonSecondary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6
  },
  buttonSecondaryText: { fontWeight: "700" },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { fontWeight: "700" }
})
