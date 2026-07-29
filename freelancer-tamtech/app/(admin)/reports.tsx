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
import {
  getConversionRatio,
  getCountyWise,
  getReconciliation,
  type ConversionRatio,
  type CountyWiseItem,
  type ReconciliationResponse,
} from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"

type Tab = "conversion" | "county" | "reconciliation"

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("conversion")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [ratio, setRatio] = useState<ConversionRatio | null>(null)
  const [counties, setCounties] = useState<CountyWiseItem[]>([])
  const [recon, setRecon] = useState<ReconciliationResponse | null>(null)

  const loadConversionTab = useCallback(async () => {
    try {
      setError(null)
      const data = await getConversionRatio()
      setRatio(data)
    } catch (err: any) {
      setError(err?.message || "Failed to load.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadCountyTab = useCallback(async () => {
    try {
      setError(null)
      const data = await getCountyWise()
      setCounties(data)
    } catch (err: any) {
      setError(err?.message || "Failed to load.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadReconTab = useCallback(async () => {
    try {
      setError(null)
      const data = await getReconciliation()
      setRecon(data)
    } catch (err: any) {
      setError(err?.message || "Failed to load.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    if (activeTab === "conversion") loadConversionTab()
    if (activeTab === "county") loadCountyTab()
    if (activeTab === "reconciliation") loadReconTab()
  }, [activeTab])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (activeTab === "conversion") await loadConversionTab()
    if (activeTab === "county") await loadCountyTab()
    if (activeTab === "reconciliation") await loadReconTab()
  }, [activeTab])

  const TabBtn = ({ tab, label }: { tab: Tab; label: string }) => (
    <TouchableOpacity
      style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  const fmt = (n: number) => n.toLocaleString()

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
            <Text style={s.headerTitle}>Reports</Text>
            <Text style={s.headerSub}>Conversion rates, county analytics & payments</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={s.tabRow}>
          <TabBtn tab="conversion" label="Conversion" />
          <TabBtn tab="county" label="County" />
          <TabBtn tab="reconciliation" label="Recon" />
        </View>

        {loading && (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={COLORS.gradientStart} />
          </View>
        )}

        {error && (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Conversion Ratio Tab */}
        {activeTab === "conversion" && ratio && !loading && (
          <View style={s.section}>
            <View style={s.bigCard}>
              <Text style={s.bigLabel}>Total Leads</Text>
              <Text style={s.bigValue}>{fmt(ratio.totalLeads)}</Text>
            </View>
            <View style={s.bigCard}>
              <Text style={s.bigLabel}>Converted Sales</Text>
              <Text style={s.bigValue}>{fmt(ratio.convertedSales)}</Text>
            </View>
            <View style={[s.bigCard, { borderLeftColor: "#10b981" }]}>
              <Text style={s.bigLabel}>Conversion Ratio</Text>
              <Text style={[s.bigValue, { color: "#10b981" }]}>{ratio.conversionRatio}%</Text>
            </View>
          </View>
        )}

        {/* County-wise Tab */}
        {activeTab === "county" && !loading && (
          <>
            {counties.length === 0 ? (
              <Text style={s.emptyText}>No county data available.</Text>
            ) : (
              counties.map((item) => (
                <View key={item.county} style={[s.card, SHADOWS.cardSm]}>
                  <View style={s.cardRow1}>
                    <Text style={s.nameText}>{item.county}</Text>
                    <Text style={s.ratioText}>
                      {item.totalLeads > 0
                        ? ((item.convertedSales / item.totalLeads) * 100).toFixed(1)
                        : 0}
                      %
                    </Text>
                  </View>
                  <View style={s.cardRow1}>
                    <Text style={s.subText}>{fmt(item.totalLeads)} leads</Text>
                    <Text style={s.subText}>{fmt(item.convertedSales)} converted</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Reconciliation Tab */}
        {activeTab === "reconciliation" && recon && !loading && (
          <View style={s.section}>
            <View style={s.reconHeader}>
              <View style={s.reconStat}>
                <Text style={s.reconStatLabel}>Total Records</Text>
                <Text style={s.reconStatValue}>{fmt(recon.totalRecords)}</Text>
              </View>
              <View style={s.reconStat}>
                <Text style={s.reconStatLabel}>Total Paid</Text>
                <Text style={[s.reconStatValue, { color: "#10b981" }]}>
                  KES {fmt(recon.totalPaidKes)}
                </Text>
              </View>
            </View>

            {recon.items.length === 0 ? (
              <Text style={s.emptyText}>No payment records found.</Text>
            ) : (
              recon.items.map((item, idx) => (
                <View key={idx} style={[s.card, SHADOWS.cardSm]}>
                  <Text style={s.codeText}>{item.payment_code}</Text>
                  <Text style={s.subText}>Ref: {item.transaction_reference}</Text>
                  <View style={s.cardRow1}>
                    <Text style={s.dateText}>{item.payment_date}</Text>
                    <Text style={s.amountText}>KES {fmt(item.amount_paid_kes)}</Text>
                  </View>
                </View>
              ))
            )}
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
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  headerSub: { marginTop: 4, fontSize: 13, color: "#64748b" },
  backBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  backText: { fontSize: 13, fontWeight: "500", color: "#64748b" },

  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  tabBtnActive: { borderColor: COLORS.gradientStart, backgroundColor: "#eff6ff" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: COLORS.gradientStart },

  section: { gap: 10 },
  bigCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gradientStart,
    borderRadius: 12,
    padding: 20,
    ...SHADOWS.cardSm,
  },
  bigLabel: { fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 },
  bigValue: { fontSize: 28, fontWeight: "800", color: "#0f172a", marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameText: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  ratioText: { fontSize: 18, fontWeight: "800", color: "#10b981" },
  subText: { fontSize: 12, color: "#64748b", marginTop: 3 },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gradientStart,
    marginBottom: 4,
  },
  dateText: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  amountText: { fontSize: 14, fontWeight: "700", color: "#10b981", marginTop: 4 },

  reconHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  reconStat: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  reconStatLabel: { fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  reconStatValue: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginTop: 4 },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.gradientStart, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
})