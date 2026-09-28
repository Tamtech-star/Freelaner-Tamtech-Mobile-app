import { useState, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Search, BarChart3, Wallet, Users, ShieldUser } from "lucide-react-native"
import { useAuthStore } from "../../src/store/authStore"
import {
  getFreelancersLocalFirst,
  syncFreelancersNow,
  getAdminLeadsLocalFirst,
  syncAdminLeadsNow,
  getConvertedSalesLocalFirst,
  syncConvertedSalesNow,
} from "../../src/api/admin"
import { subscribeToOfflineData } from "../../src/offline/syncWorker"
import { COLORS, SHADOWS } from "../../src/constants/config"

// Web-app brand gradient: from-[#2881FA] to-[#45E0D7]
const BRAND_BLUE = "#2881FA"
const BRAND_TEAL = "#45E0D7"

export default function AdminDashboardScreen() {
  const { user, logout } = useAuthStore()
  const [freelancerCount, setFreelancerCount] = useState<number | null>(null)
  const [leadCount, setLeadCount] = useState<number | null>(null)
  const [convertedCount, setConvertedCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadLocalOnly = useCallback(async () => {
    const [f, l, c] = await Promise.allSettled([
      getFreelancersLocalFirst(),
      getAdminLeadsLocalFirst(),
      getConvertedSalesLocalFirst(),
    ])
    if (f.status === "fulfilled") setFreelancerCount(f.value.length)
    if (l.status === "fulfilled") setLeadCount(l.value.length)
    if (c.status === "fulfilled") setConvertedCount(c.value.length)
    setLoading(false)
  }, [])

  const fetchNetwork = useCallback(async () => {
    const [f, l, c] = await Promise.allSettled([
      syncFreelancersNow(),
      syncAdminLeadsNow(),
      syncConvertedSalesNow(),
    ])
    if (f.status === "fulfilled") setFreelancerCount(f.value.length)
    if (l.status === "fulfilled") setLeadCount(l.value.length)
    if (c.status === "fulfilled") setConvertedCount(c.value.length)
  }, [])

  useFocusEffect(
    useCallback(() => {
      let isActive = true
      loadLocalOnly().then(() => {
        if (isActive) fetchNetwork()
      })
      const unsub = subscribeToOfflineData(loadLocalOnly)
      return () => {
        unsub()
        isActive = false
      }
    }, [loadLocalOnly, fetchNetwork])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchNetwork()
    } finally {
      setRefreshing(false)
    }
  }, [fetchNetwork])

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const fmt = (n: number | null) => (n !== null ? n.toLocaleString() : "...")

  const MetricCard = ({
    label,
    value,
    color,
    onPress,
  }: {
    label: string
    value: number | null
    color: string
    onPress?: () => void
  }) => (
    <TouchableOpacity
      style={[s.metricCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={s.metricValue}>{fmt(value)}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={s.container}>
      {/* Brand Bar */}
      <View style={s.brandBar}>
        <Text style={s.brandText}></Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_BLUE} />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Admin Dashboard</Text>
            <Text style={s.headerSub}>
              Welcome, {user?.name || "Admin"}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Quick-Action Cards — 7 sections */}
        <View style={s.cardRow}>
          <TouchableOpacity
            style={[s.actionCard]}
            onPress={() => router.push("/(admin)/review")}
          >
            <View style={s.actionIconWrap}>
              <Search size={22} color="#2563eb" />
            </View>
            <Text style={s.actionTitle}>Review Queue</Text>
            <Text style={s.actionDesc}>Approve payments, duplicates & conversions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard]}
            onPress={() => router.push("/(admin)/reports")}
          >
            <View style={s.actionIconWrap}>
              <BarChart3 size={22} color="#2563eb" />
            </View>
            <Text style={s.actionTitle}>Reports</Text>
            <Text style={s.actionDesc}>Conversion rates, county analytics & reconciliation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard]}
            onPress={() => router.push("/(admin)/sales-dashboard")}
          >
            <View style={s.actionIconWrap}>
              <BarChart3 size={22} color="#2563eb" />
            </View>
            <Text style={s.actionTitle}>Sales Dashboard</Text>
            <Text style={s.actionDesc}>View total, direct & freelancer sales</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard]}
            onPress={() => router.push("/(admin)/paymentrecords")}
          >
            <View style={s.actionIconWrap}>
              <Wallet size={22} color="#2563eb" />
            </View>
            <Text style={s.actionTitle}>Payment Records</Text>
            <Text style={s.actionDesc}>Track all commission payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard]}
            onPress={() => router.push("/(admin)/freelancers")}
          >
            <View style={s.actionIconWrap}>
              <Users size={22} color="#2563eb" />
            </View>
            <Text style={s.actionTitle}>Manage Freelancers</Text>
            <Text style={s.actionDesc}>View, search and delete freelancers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard]}
            onPress={() => router.push("/(admin)/users")}
          >
            <View style={s.actionIconWrap}>
              <ShieldUser size={22} color="#2563eb" />
            </View>
            <Text style={s.actionTitle}>Admin Users</Text>
            <Text style={s.actionDesc}>Manage admin accounts</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <Text style={s.loadingText}>Loading metrics...</Text>
          </View>
        )}

        {/* Platform Metrics — 6 cards; 3 visible & clickable */}
        <View style={s.metricsSection}>
          <Text style={s.sectionTitle}>Platform Metrics</Text>
          <View style={s.metricsGrid}>
            {/* ── VISIBLE & CLICKABLE ── */}
            <MetricCard
              label="Total Freelancers"
              value={freelancerCount}
              color="#6366f1"
              onPress={() => router.push("/(admin)/freelancers")}
            />
            <MetricCard
              label="Total Leads"
              value={leadCount}
              color="#3b82f6"
              onPress={() => router.push("/(admin)/leads")}
            />
            <MetricCard
              label="Converted Sales"
              value={convertedCount}
              color="#f59e0b"
              onPress={() => router.push("/(admin)/sales-dashboard")}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  brandBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingVertical: 16,
  },
  brandText: { fontSize: 20, fontWeight: "700", color: "#1e293b" },

  scroll: { flex: 1, paddingHorizontal: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 20,
  },
  headerLeft: { flex: 1, paddingRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  headerSub: { marginTop: 4, fontSize: 14, color: "#64748b" },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { fontSize: 12, fontWeight: "500", color: "#dc2626" },

  cardRow: { gap: 10, marginBottom: 24 },
  actionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.cardSm,
  },
 actionIconWrap: { 
    marginBottom: 8, 
    justifyContent: "center", 
    alignItems: "center",
    alignSelf: "flex-start" 
  },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  actionDesc: { marginTop: 2, fontSize: 12, color: "#64748b", lineHeight: 16 },

  metricsSection: { marginTop: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "47%" as any,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 14,
    ...SHADOWS.cardSm,
  },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#1e293b" },
  metricLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  centerWrap: { marginTop: 32, alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14, color: "#64748b" },
  errorWrap: { marginTop: 24, alignItems: "center", paddingHorizontal: 16 },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
})
