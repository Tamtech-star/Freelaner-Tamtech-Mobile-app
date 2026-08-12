import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ActivityIndicator, View, StyleSheet } from "react-native"
import { useAuthStore } from "../src/store/authStore"
import { COLORS } from "../src/constants/config"
import { initializeDatabase } from "../src/offline/database"
import { startSyncWorker } from "../src/offline/syncWorker"

export default function RootLayout() {
  const { isLoading, isAuthenticated, role, restoreSession } = useAuthStore()

  useEffect(() => {
    restoreSession()
    let stopSync: (() => void) | undefined
    void initializeDatabase()
      .then(() => {
        stopSync = startSyncWorker()
      })
      .catch(() => undefined)
    return () => stopSync?.()
  }, [])

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.gradientStart} />
        <StatusBar style="dark" />
      </View>
    )
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated && role === "sales_agent" ? (
          <Stack.Screen name="(sales-record)" />
        ) : isAuthenticated && role === "admin" ? (
          <Stack.Screen name="(admin)" />
        ) : isAuthenticated && role === "freelancer" ? (
          <Stack.Screen name="(freelancer)" />
        ) : (
          <Stack.Screen name="login" />
        )}
        <Stack.Screen name="(public)" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
})
