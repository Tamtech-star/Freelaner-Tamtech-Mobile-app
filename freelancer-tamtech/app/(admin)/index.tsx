import { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { useAuthStore } from "../../src/store/authStore"
import { getAdminDashboard } from "../../src/api/admin"
import type { AdminMetrics } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

export default function AdminDashboardScreen() {
  const { user, logout } = useAuthStore()
  const [metrics, setMetrics] = useState<AdminMetrics["metrics"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getAdminDashboard()
      setMetrics(data.metrics)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load dashboard.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
  }, [load])

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const fmt = (n: number) => n.toLocaleString()

  const MetricCard = ({
    label,
    value,
    color,
    onPress,
  }: {
    label: string
    value: number
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
      <View style={s.brandBar}>
        <Text style={s.brandText}>TAMTECH TOOLS LTD</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gradientStart} />
        }
      >
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

        {/* Quick Actions */}
        <View style={s.cardRow}>
          <TouchableOpacity
            style={[s.actionCard, SHADOWS.cardSm]}
            onPress={() => router.push("/(admin)/review")}
          >
            <Text style={s.actionIcon}>🔍</Text>
            <Text style={s.actionTitle}>Review Queue</Text>
            <Text style={s.actionDesc}>Pending payments, duplicates & conversions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard, SHADOWS.cardSm]}
            onPress={() => router.push("/(admin)/freelancers")}
          >
            <Text style={s.actionIcon}>👥</Text>
            <Text style={s.actionTitle}>Freelancers</Text>
            <Text style={s.actionDesc}>Manage registered freelancers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionCard, SHADOWS.cardSm]}
            onPress={() => router.push("/(admin)/reports")}
          >
            <Text style={s.actionIcon}>📊</Text>
            <Text style={s.actionTitle}>Reports</Text>
            <Text style={s.actionDesc}>Conversion rates, county-wise & reconciliation</Text>
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading && (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={COLORS.gradientStart} />
            <Text style={s.loadingText}>Loading metrics...</Text>
          </View>
        )}

        {/* Error state */}
        {error && (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <View style={s.metricsSection}>
            <Text style={s.sectionTitle}>Platform Metrics</Text>
            <View style={s.metricsGrid}>
              <MetricCard
                label="Total Freelancers"
                value={metrics.total_freelancers}
                color="#6366f1"
                onPress={() => router.push("/(admin)/freelancers")}
              />
              <MetricCard
                label="Active Freelancers"
                value={metrics.active_freelancers}
                color="#10b981"
              />
              <MetricCard
                label="Total Leads"
                value={metrics.total_leads}
                color="#3b82f6"
              />
              <MetricCard
                label="Converted Sales"
                value={metrics.converted_sales}
                color="#f59e0b"
              />
              <MetricCard
                label="Pending Validations"
                value={metrics.pending_validations}
                color="#ef4444"
                onPress={() => router.push("/(admin)/review")}
              />
              <MetricCard
                label="Pending Payments"
                value={metrics.pending_payments}
                color="#8b5cf6"
                onPress={() => router.push("/(admin)/review")}
              />
            </View>
          </View>
        )}
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
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  logoutText: { fontSize: 12, fontWeight: "500", color: "#dc2626" },

  cardRow: { gap: 12, marginBottom: 24 },
  actionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  actionDesc: { marginTop: 2, fontSize: 12, color: "#64748b", lineHeight: 16 },

  metricsSection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#334155", marginBottom: 12 },
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
  metricLabel: { fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },

  centerWrap: { marginTop: 32, alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14, color: "#64748b" },
  errorWrap: { marginTop: 24, alignItems: "center", paddingHorizontal: 16 },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: COLORS.gradientStart,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
})