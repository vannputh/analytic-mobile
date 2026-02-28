import { Stack } from "expo-router"
import { AppProviders } from "@/src/shared/providers/AppProviders"
import { assertEnv } from "@/src/shared/config/env"

export default function RootLayout() {
  assertEnv()

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="(auth)" options={{ animation: "none" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      </Stack>
    </AppProviders>
  )
}
