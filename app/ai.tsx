import { Stack } from "expo-router"
import { AIScreen } from "@/src/features/ai/screens/AIScreen"

export default function AIRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Assistant", headerLargeTitle: true }} />
      <AIScreen />
    </>
  )
}
