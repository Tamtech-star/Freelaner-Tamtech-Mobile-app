import { useEffect, useState } from "react"
import { router, Stack, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ActivityIndicator, View, StyleSheet } from "react-native"
import { useAuthStore } from "../src/store/authStore"
import { COLORS } from "../src/constants/config"
import { initializeDatabase } from "../src/offline/database"
import { startSyncWorker } from "../src/offline/syncWorker"
import {
  getDefaultAuthenticatedRoute,
  getRestorableAuthenticatedRoute,
  shouldPersistAuthenticatedRoute,
} from "../src/navigation/persistedRoute"
import {
  getStoredAuthenticatedRoute,
  storeAuthenticatedRoute,
} from "../src/navigation/routeStorage"

export default function RootLayout() {
  const { isLoading, isAuthenticated, role, restoreSession } = useAuthStore()
  const segments = useSegments()
  const authenticatedPath = segments.length ? `/${segments.join("/")}` : "/"
  const [startupRoute, setStartupRoute] = useState<string | null>(null)
  const [navigationRestored, setNavigationRestored] = useState(false)

  useEffect(() => {
    void (async () => {
      const restoredRole = await restoreSession()
      if (!restoredRole || restoredRole === "guest") {
        setNavigationRestored(true)
        return
      }
      const savedRoute = await getStoredAuthenticatedRoute().catch(() => null)
      setStartupRoute(getRestorableAuthenticatedRoute(savedRoute, restoredRole))
      setNavigationRestored(true)
    })()
    let stopSync: (() => void) | undefined
    void initializeDatabase()
      .then(() => {
        stopSync = startSyncWorker()
      })
      .catch(() => undefined)
    return () => stopSync?.()
  }, [])

  useEffect(() => {
    if (!navigationRestored || !startupRoute) return
    if (authenticatedPath === startupRoute) {
      setStartupRoute(null)
      return
    }
    router.replace(startupRoute as any)
  }, [authenticatedPath, navigationRestored, startupRoute])

  useEffect(() => {
    if (!navigationRestored || startupRoute || isLoading || !isAuthenticated || !role || role === "guest") return
    if (!shouldPersistAuthenticatedRoute(authenticatedPath, role)) return
    void storeAuthenticatedRoute(authenticatedPath).catch(() => undefined)
  }, [authenticatedPath, isAuthenticated, isLoading, navigationRestored, role, startupRoute])

  useEffect(() => {
    if (!navigationRestored || startupRoute || isLoading || !isAuthenticated || !role || role === "guest") return
    if (authenticatedPath === "/" || authenticatedPath === "/login") {
      router.replace(getDefaultAuthenticatedRoute(role) as any)
    }
  }, [authenticatedPath, isAuthenticated, isLoading, navigationRestored, role, startupRoute])

  if (isLoading || !navigationRestored) {
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
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        {isAuthenticated && role === "sales_agent" ? (
          <Stack.Screen name="(sales-record)" />
        ) : isAuthenticated && role === "admin" ? (
          <Stack.Screen name="(admin)" />
        ) : isAuthenticated && role === "freelancer" ? (
          <Stack.Screen name="(freelancer)" />
        ) : null}
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
