import { useEffect, useRef, useState } from "react"
import { router, Stack, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ActivityIndicator, View, StyleSheet } from "react-native"
import { useAuthStore } from "../src/store/authStore"
import { COLORS } from "../src/constants/config"
import { initializeDatabase } from "../src/offline/database"
import { startSyncWorker } from "../src/offline/syncWorker"
import {
  getDefaultAuthenticatedRoute,
  getRestoreStack,
  shouldPersistAuthenticatedRoute,
} from "../src/navigation/persistedRoute"
import type { RestoreStack } from "../src/navigation/persistedRoute"
import {
  getStoredAuthenticatedRoute,
  storeAuthenticatedRoute,
} from "../src/navigation/routeStorage"
import { ThemeProvider } from "../src/theme/theme"

export default function RootLayout() {
  const { isLoading, isAuthenticated, role, restoreSession } = useAuthStore()
  const segments = useSegments()
  const authenticatedPath = segments.length ? `/${segments.join("/")}` : "/"
  const [startupRestore, setStartupRestore] = useState<RestoreStack | null>(null)
  const [navigationRestored, setNavigationRestored] = useState(false)
  const restorationStarted = useRef(false)
  const currentPathRef = useRef(authenticatedPath)
  currentPathRef.current = authenticatedPath

  useEffect(() => {
    void (async () => {
      const restoredRole = await restoreSession()
      if (!restoredRole || restoredRole === "guest") {
        setNavigationRestored(true)
        return
      }
      const savedRoute = await getStoredAuthenticatedRoute().catch(() => null)
      setStartupRestore(getRestoreStack(savedRoute, restoredRole))
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
    if (!navigationRestored || !startupRestore) return
    const { home, target } = startupRestore
    if (target && authenticatedPath === target) {
      setStartupRestore(null)
      return
    }
    if (restorationStarted.current) {
      // The one-shot attempt already ran. Release the guard once the user is
      // on the role home, the saved screen, or somewhere they navigated to
      // themselves, so route persistence and the "/" -> home redirect resume.
      if (
        authenticatedPath !== "/" &&
        authenticatedPath !== "/login" &&
        authenticatedPath !== home &&
        authenticatedPath !== target
      ) {
        setStartupRestore(null)
      }
      return
    }
    restorationStarted.current = true
    // Seed the stack with the role home, then push the saved screen on top of
    // it. A lone router.replace(savedScreen) leaves a depth-1 stack with no
    // history: Android Back and in-app back buttons have nothing to pop and
    // the app appears stuck on the restored page until reinstall.
    router.replace(home as any)
    if (target && target !== home) {
      router.push(target as any)
    }
  }, [authenticatedPath, navigationRestored, startupRestore])

  // Bounded fallback: if the saved screen never mounts within a short window,
  // park on the role home and stop retrying it on future launches. This timer
  // is independent of path changes so it still fires when the push fails.
  useEffect(() => {
    if (!navigationRestored || !startupRestore) return
    const { home, target } = startupRestore
    const fallbackTimer = setTimeout(() => {
      const current = currentPathRef.current
      if (current !== target && current === home) {
        void storeAuthenticatedRoute(home).catch(() => undefined)
      }
      setStartupRestore(null)
    }, 1500)
    // Do not keep replacing indefinitely if the target route cannot mount.
    // Normal navigation and the role-home fallback must remain available.
    return () => clearTimeout(fallbackTimer)
  }, [navigationRestored, startupRestore])

  useEffect(() => {
    if (!navigationRestored || startupRestore || isLoading || !isAuthenticated || !role || role === "guest") return
    if (!shouldPersistAuthenticatedRoute(authenticatedPath, role)) return
    void storeAuthenticatedRoute(authenticatedPath).catch(() => undefined)
  }, [authenticatedPath, isAuthenticated, isLoading, navigationRestored, role, startupRestore])

  useEffect(() => {
    if (!navigationRestored || startupRestore || isLoading || !isAuthenticated || !role || role === "guest") return
    if (authenticatedPath === "/" || authenticatedPath === "/login") {
      router.replace(getDefaultAuthenticatedRoute(role) as any)
    }
  }, [authenticatedPath, isAuthenticated, isLoading, navigationRestored, role, startupRestore])

  if (isLoading || !navigationRestored) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.gradientStart} />
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <ThemeProvider>
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
        <StatusBar style="auto" />
      </>
    </ThemeProvider>
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
