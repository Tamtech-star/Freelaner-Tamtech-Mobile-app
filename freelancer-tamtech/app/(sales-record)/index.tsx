import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from "react-native"
import { useState, useCallback } from "react"
import { router } from "expo-router"
import { useAuthStore } from "../../src/store/authStore"
import { COLORS, SHADOWS } from "../../src/constants/config"
import type { SaleConversion } from "../../src/types"

const MOCK_SALES: SaleConversion[] = [
  {
    id: "1",
    customer_name: "Musa Simon",
    customer_type: "individual",
    phone_number: "0712345678",
    bike_model: "EKON450M1V2",
    sale_amount: 85000,
    submission_type: "direct_sale",
    status: "completed",
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
    router.replace("/login")
  }

  const renderSaleItem = ({ item }: { item: SaleConversion }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleName}>{item.customer_name}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "completed" ? styles.statusCompleted : styles.statusPending,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "completed" ? styles.statusTextCompleted : styles.statusTextPending,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.saleDetail}>{item.bike_model}</Text>
      <Text style={styles.salePrice}>KES {item.sale_amount.toLocaleString()}</Text>
      <Text style={styles.saleDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name || "Sales Agent"}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>SA</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/(sales-record)/form")}
        >
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionTitle}>Record Direct Sale</Text>
          <Text style={styles.actionDesc}>Capture a new bike sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() =>
            router.push({ pathname: "/(sales-record)/form", params: { type: "lead_conversion" } })
          }
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gradientStart} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sales recorded yet.</Text>
            <Text style={styles.emptySubtext}>Tap above to record your first sale</Text>
          </View>
        }
        contentContainerStyle={sales.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 13,
    color: COLORS.muted,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.heading,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userBadge: {
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  userBadgeText: {
    color: COLORS.info,
    fontWeight: "600",
    fontSize: 13,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.cardSm,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 12,
  },
  saleCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    ...SHADOWS.cardSm,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  saleName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.heading,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusCompleted: {
    backgroundColor: COLORS.successBg,
  },
  statusPending: {
    backgroundColor: COLORS.warningBg,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusTextCompleted: {
    color: COLORS.success,
  },
  statusTextPending: {
    color: COLORS.warning,
  },
  saleDetail: {
    fontSize: 13,
    color: COLORS.body,
    marginBottom: 2,
  },
  salePrice: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.heading,
    marginTop: 2,
  },
  saleDate: {
    fontSize: 12,
    color: COLORS.light,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.light,
  },
})
