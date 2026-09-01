import AsyncStorage from "@react-native-async-storage/async-storage"
import { STORAGE_KEYS } from "../constants/config"

export async function getStoredAuthenticatedRoute(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.LAST_AUTH_ROUTE)
}

export async function storeAuthenticatedRoute(pathname: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_AUTH_ROUTE, pathname)
}

export async function clearStoredAuthenticatedRoute(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.LAST_AUTH_ROUTE)
}
