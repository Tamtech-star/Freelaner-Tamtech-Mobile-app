import { Stack } from 'expo-router'

export default function SalesRecordLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="form" />
      <Stack.Screen name="preview" />
    </Stack>
  )
}
