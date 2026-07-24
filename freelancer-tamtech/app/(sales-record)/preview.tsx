import { View, Text, StyleSheet } from 'react-native'

export default function SalesRecordPreview() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preview & Confirm</Text>
      <Text style={styles.subtitle}>Coming in Phase 4 - review all data before submission</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
})
