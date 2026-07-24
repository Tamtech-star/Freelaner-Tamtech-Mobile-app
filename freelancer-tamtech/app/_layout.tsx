import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useAuthStore } from '../src/store/authStore'

export default function RootLayout() {
  const { isLoading, isAuthenticated, role, restoreSession } = useAuthStore()

  useEffect(() => {
    restoreSession()
  }, [])

  // Show splash/loading while checking stored session
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <StatusBar style="light" />
      </View>
    )
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated && role === 'sales_agent' ? (
          <Stack.Screen name="(sales-record)" />
        ) : isAuthenticated && role === 'freelancer' ? (
          <Stack.Screen name="(freelancer)" />
        ) : (
          <Stack.Screen name="login" />
        )}
        <Stack.Screen name="(public)" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
})
