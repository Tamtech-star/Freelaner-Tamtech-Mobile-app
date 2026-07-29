import { Stack } from "expo-router"

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="review" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="freelancers" />
      <Stack.Screen name="convertedsales" />
      <Stack.Screen name="paymentrecords" />
      <Stack.Screen name="users" />
    </Stack>
  )
}