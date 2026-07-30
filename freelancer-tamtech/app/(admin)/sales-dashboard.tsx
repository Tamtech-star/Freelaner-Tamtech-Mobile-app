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
import { BarChart3, Building2, Handshake } from "lucide-react-native"
import { getAllSales, getConvertedSales } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"

export default function SalesDashboardScreen() {
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [directCount, setDirectCount] = useState<number | null>(null)
  const [freelancerCount, setFreelancerCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [all, converted] = await Promise.all([
        getAllSales(),
        getConvertedSales(),
      ])
      setTotalCount(all.length)
      setDirectCount(all.filter((s) => s.submission_type === "direct_sale").length)
      // Only count freelancer_lead submissions — backend may return other types like "trek"
      setFreelancerCount(
        converted.filter((s) => s.submission_type === "freelancer_lead").length
      )
    } catch {
      // counts will remain null, handled in UI
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const fmt = (n: number | null) => (n !== null ? n.toLocaleString() : "...")

  return (
    <View style={s.container}>
      <View style={s.brandBar}>
        <Text style={s.brandText}>TAMTECH TOOLS LTD</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_BLUE} />
        }
      >
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Sales Dashboard</Text>
            <Text style={s.headerSub}>Overview of all sales records</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
          </View>
        )}

        {/* Card 1: Total Sales */}
        <TouchableOpacity
          style={[s.card, { borderLeftColor: "#3b82f6" }]}
          onPress={() => router.push("/(admin)/sales-list?filter=total")}
          activeOpacity={0.7}
        >
          <View style={s.cardIconWrap}>
            <BarChart3 size={24} color="#3b82f6" />
          </View>
          <View style={s.cardContent}>
            <Text style={s.cardValue}>{fmt(totalCount)}</Text>
            <Text style={s.cardLabel}>Total Sales</Text>
            <Text style={s.cardDesc}>All sales records — direct & freelancer</Text>
          </View>
        </TouchableOpacity>

        {/* Card 2: Direct Sales */}
        <TouchableOpacity
          style={[s.card, { borderLeftColor: "#10b981" }]}
          onPress={() => router.push("/(admin)/sales-list?filter=direct")}
          activeOpacity={0.7}
        >
          <View style={s.cardIconWrap}>
            <Building2 size={24} color="#10b981" />
          </View>
          <View style={s.cardContent}>
            <Text style={s.cardValue}>{fmt(directCount)}</Text>
            <Text style={s.cardLabel}>Direct Sales</Text>
            <Text style={s.cardDesc}>Only direct sales by agents</Text>
          </View>
        </TouchableOpacity>

        {/* Card 3: Freelancer Lead Sales */}
        <TouchableOpacity
          style={[s.card, { borderLeftColor: "#f59e0b" }]}
          onPress={() => router.push("/(admin)/convertedsales")}
          activeOpacity={0.7}
        >
          <View style={s.cardIconWrap}>
            <Handshake size={24} color="#f59e0b" />
          </View>
          <View style={s.cardContent}>
            <Text style={s.cardValue}>{fmt(freelancerCount)}</Text>
            <Text style={s.cardLabel}>Freelancer Lead Sales</Text>
            <Text style={s.cardDesc}>Converted freelancer leads</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  brandBar: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0", backgroundColor: "#fff", paddingVertical: 16,
  },
  brandText: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 24 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  headerSub: { marginTop: 4, fontSize: 13, color: "#64748b" },
  backBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  backText: { fontSize: 13, fontWeight: "500", color: "#64748b" },
  centerWrap: { marginTop: 32, alignItems: "center" },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    ...SHADOWS.cardSm,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardValue: { fontSize: 22, fontWeight: "800", color: "#1e293b" },
  cardLabel: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 2 },
  cardDesc: { fontSize: 11, color: "#64748b", marginTop: 2 },
})