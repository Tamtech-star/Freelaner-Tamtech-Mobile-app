import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { useState, useCallback } from 'react'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import type { SaleConversion } from '../../src/types'

// Placeholder: will be replaced with real API call in Phase 2 from my scibble.md
const MOCK_SALES: SaleConversion[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_type: 'individual',
    phone_number: '0712345678',
    bike_model: 'TVS King',
    sale_amount: 85000,
    submission_type: 'direct_sale',
    status: 'completed',
    created_at: new Date().toISOString(),
  },
]

export default function SalesRecordHome() {
  const { user, logout } = useAuthStore()
  const [sales, setSales] = useState<SaleConversion[]>(MOCK_SALES)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    // TODO: fetch from API in Phase 2
    setRefreshing(false)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  const renderSaleItem = ({ item }: { item: SaleConversion }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleName}>{item.customer_name}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.statusCompleted : styles.statusPending,
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.saleDetail}>{item.bike_model}</Text>
      <Text style={styles.saleDetail}>
        KES {item.sale_amount.toLocaleString()}
      </Text>
      <Text style={styles.saleDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name || 'Sales Agent'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Action Cards */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionDirect]}
          onPress={() => router.push('/(sales-record)/form')}
        >
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionTitle}>Record Direct Sale</Text>
          <Text style={styles.actionDesc}>Capture a new bike sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionConvert]}
          onPress={() => router.push({ pathname: '/(sales-record)/form', params: { type: 'lead_conversion' } })}
        >
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionTitle}>Convert Lead</Text>
          <Text style={styles.actionDesc}>Convert a freelancer lead</Text>
        </TouchableOpacity>
      </View>

      {/* Sales History */}
      <Text style={styles.sectionTitle}>Sales History</Text>
      <FlatList
        data={sales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No sales recorded yet.</Text>
        }
        contentContainerStyle={sales.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionDirect: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  actionConvert: {
    backgroundColor: '#1a3a2a',
    borderColor: '#22c55e',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  saleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  saleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusCompleted: {
    backgroundColor: '#166534',
  },
  statusPending: {
    backgroundColor: '#713f12',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f8fafc',
    textTransform: 'capitalize',
  },
  saleDetail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 2,
  },
  saleDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
  },
})
