import Ionicons from "@expo/vector-icons/Ionicons"
import { Redirect } from "expo-router"
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs"
import { ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/src/features/auth/hooks/useAuth"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"

export default function TabsLayout() {
  const { loading, session } = useAuth()
  const { palette } = useAppTheme()

  if (loading) {
    return (
      <SafeAreaView style={[styles.loading, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <NativeTabs
      tintColor={palette.primary}
      iconColor={{
        default: palette.textMuted,
        selected: palette.primary
      }}
      labelStyle={{
        default: {
          color: palette.textMuted,
          fontSize: 11,
          fontWeight: "600"
        },
        selected: {
          color: palette.primary,
          fontSize: 11,
          fontWeight: "600"
        }
      }}
      backgroundColor={palette.surface}
      shadowColor={palette.border}
      blurEffect="systemChromeMaterial"
      disableTransparentOnScrollEdge
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="media">
        <Label>Media</Label>
        <Icon
          sf={{ default: "play.circle", selected: "play.circle.fill" }}
          androidSrc={{
            default: <VectorIcon family={Ionicons} name="play-circle-outline" />,
            selected: <VectorIcon family={Ionicons} name="play-circle" />
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="food">
        <Label>Food</Label>
        <Icon
          sf={{ default: "fork.knife.circle", selected: "fork.knife.circle.fill" }}
          androidSrc={{
            default: <VectorIcon family={Ionicons} name="restaurant-outline" />,
            selected: <VectorIcon family={Ionicons} name="restaurant" />
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
          androidSrc={{
            default: <VectorIcon family={Ionicons} name="person-circle-outline" />,
            selected: <VectorIcon family={Ionicons} name="person-circle" />
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" }
})
