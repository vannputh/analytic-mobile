import { Stack } from "expo-router"
import { AdminScreen } from "@/src/features/admin/screens/AdminScreen"

export default function AdminRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Admin" }} />
      <AdminScreen />
    </>
  )
}
