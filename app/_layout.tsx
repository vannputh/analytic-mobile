import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AppProviders } from "@/src/shared/providers/AppProviders"
import { getClientEnvError } from "@/src/shared/config/env"
import { EnvironmentErrorScreen } from "@/src/shared/screens/EnvironmentErrorScreen"

export default function RootLayout() {
  const envError = getClientEnvError()

  if (envError) {
    return (
      <SafeAreaProvider>
        <EnvironmentErrorScreen message={envError.message} />
      </SafeAreaProvider>
    )
  }

  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerShadowVisible: false,
          headerLargeTitle: true
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ animation: "fade", headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
        <Stack.Screen name="ai" options={{ title: "Assistant", headerLargeTitle: true }} />
        <Stack.Screen name="admin" options={{ title: "Admin" }} />
      </Stack>
    </AppProviders>
  )
}
