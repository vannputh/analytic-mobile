import { Stack } from "expo-router"

export default function MediaStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerBackTitle: "Media"
      }}
    >
      <Stack.Screen
        name="add"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          headerLargeTitle: false
        }}
      />
    </Stack>
  )
}
