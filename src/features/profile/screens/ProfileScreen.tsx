import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { supabase } from "@/src/shared/api/supabase"
import { SegmentedSwitch } from "@/src/shared/components/workspace/SegmentedSwitch"
import { useAuth } from "@/src/features/auth/hooks/useAuth"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { ScreenScrollView } from "@/src/shared/components/native/screen-scroll-view"
import { SettingsRow } from "@/src/shared/components/native/settings-row"
import { useAppTheme, type AppTheme } from "@/src/shared/theme/ThemeProvider"

interface ProfileState {
  email: string
  status: "pending" | "approved" | "rejected" | "unknown"
  isAdmin: boolean
}

export function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()
  const { theme, resolvedTheme, palette, setTheme, ready } = useAppTheme()
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

    void loadProfile()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <ScreenScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 + insets.bottom, gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: palette.text, fontSize: 34, fontWeight: "700", letterSpacing: -0.6 }}>
          Profile
        </Text>
        <Text selectable style={{ color: palette.textMuted, fontSize: 15 }}>
          Account settings, appearance, and workspace tools.
        </Text>
      </View>

      <GroupedSection title="Account">
        <SettingsRow title="Email" value={profile.email || "No user"} />
        <SettingsRow title="Access" value={profile.status} />
        <SettingsRow title="Role" value={profile.isAdmin ? "Admin" : "User"} />
      </GroupedSection>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ color: palette.textMuted, fontSize: 13, fontWeight: "600", paddingHorizontal: 4 }}>
          Appearance
        </Text>
        <SegmentedSwitch<AppTheme>
          value={theme}
          onChange={(next) => {
            void setTheme(next)
          }}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" }
          ]}
        />
        <Text selectable style={{ color: palette.textMuted, fontSize: 12, paddingHorizontal: 4 }}>
          Currently using {resolvedTheme} appearance.
        </Text>
      </View>

      <GroupedSection title="Tools">
        <SettingsRow
          title="Analytics"
          subtitle="Open the cross-workspace dashboard."
          onPress={() => router.push("/analytics")}
        />
        {profile.isAdmin ? (
          <SettingsRow
            title="Admin Console"
            subtitle="Review requests and manage users."
            onPress={() => router.push("/admin")}
          />
        ) : null}
      </GroupedSection>

      <GroupedSection title="Session">
        <SettingsRow
          title={ready ? "Sign Out" : "Loading Theme..."}
          destructive
          onPress={async () => {
            await signOut()
            router.replace("/(auth)/login")
          }}
        />
      </GroupedSection>
    </ScreenScrollView>
  )
}
