import { Stack } from "expo-router"
import { AppProviders } from "@/src/shared/providers/AppProviders"
import { assertEnv } from "@/src/shared/config/env"

export default function RootLayout() {
  assertEnv()

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppProviders>
  )
}
