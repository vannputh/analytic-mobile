import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return AsyncStorage.getItem(key)
  }
}

async function setItem(key: string, value: string): Promise<void> {
  const writes = [
    SecureStore.setItemAsync(key, value).catch(() => undefined),
    AsyncStorage.setItem(key, value)
  ]

  await Promise.all(writes)
}

async function removeItem(key: string): Promise<void> {
  const removals = [
    SecureStore.deleteItemAsync(key).catch(() => undefined),
    AsyncStorage.removeItem(key)
  ]

  await Promise.all(removals)
}

export const supabaseStorage = {
  getItem,
  setItem,
  removeItem
}
