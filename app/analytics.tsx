import { Stack } from "expo-router"
import { AnalyticsScreen } from "@/src/features/analytics/screens/AnalyticsScreen"

export default function AnalyticsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Analytics" }} />
      <AnalyticsScreen />
    </>
  )
}
