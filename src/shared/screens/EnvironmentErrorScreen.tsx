import { StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

interface EnvironmentErrorScreenProps {
  message: string
}

export function EnvironmentErrorScreen({ message }: EnvironmentErrorScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Configuration Error</Text>
        <Text style={styles.title}>App startup is blocked by invalid environment settings.</Text>
        <Text style={styles.body}>{message}</Text>
        <Text style={styles.hint}>
          Verify `.env.local`, make sure `EXPO_PUBLIC_SUPABASE_URL` is a full `https://...supabase.co` URL,
          then restart Expo.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24
  },
  card: {
    marginTop: "auto",
    marginBottom: "auto",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 20,
    gap: 12
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#475569"
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#0f172a"
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: "#334155"
  },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64748b"
  }
})
