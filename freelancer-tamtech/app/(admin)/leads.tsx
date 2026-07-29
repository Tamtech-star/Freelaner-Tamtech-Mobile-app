import { useState, useCallback, useEffect, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
} from "react-native"
import { router } from "expo-router"
import { getAdminLeads, type LeadRow } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"
const CSV_URL = "https://spirospares.com/api/portal/admin/leads/csv"

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "#dbeafe", text: "#1e40af" },
  contacted: { bg: "#fef3c7", text: "#92400e" },
  converted: { bg: "#d1fae5", text: "#065f46" },
  commission_approved: { bg: "#d1fae5", text: "#065f46" },
  commission_paid: { bg: "#ede9fe", text: "#5b21b6" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
}

export default function LeadsScreen() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getAdminLeads()
      setLeads(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load leads.")
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

  const handleCsvDownload = async () => {
    try {
      await Linking.openURL(CSV_URL)
    } catch {
      Alert.alert("Error", "Could not open download link.")
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return leads
    const q = search.toLowerCase()
    return leads.filter(
      (l) =>
        l.lead_code.toLowerCase().includes(q) ||
        l.customer_full_name.toLowerCase().includes(q) ||
        l.county.toLowerCase().includes(q) ||
        (l.freelancers?.full_name || "").toLowerCase().includes(q)
    )
  }, [leads, search])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return d || ""
    }
  }

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_BLUE} />
        }
      >
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Total Leads</Text>
            <Text style={s.headerSub}>{leads.length} leads</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <TextInput
            placeholder="Search by lead code, name, county or freelancer..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
          />
        </View>

        {loading && (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
          </View>
        )}

        {error && (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <Text style={s.emptyText}>
            {search ? "No leads match your search." : "No leads found."}
          </Text>
        )}

        {filtered.map((item) => (
          <View key={item.id} style={[s.card, SHADOWS.cardSm]}>
            <View style={s.cardRow1}>
              <Text style={s.codeText}>{item.lead_code}</Text>
              <View style={[s.statusBadge, { backgroundColor: (STATUS_BADGE[item.lead_status] || { bg: "#f1f5f9" }).bg }]}>
                <Text style={[s.statusText, { color: (STATUS_BADGE[item.lead_status] || { text: "#475569" }).text }]}>
                  {item.lead_status.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            <Text style={s.nameText}>{item.customer_full_name}</Text>
            <View style={s.detailRow}>
              <Text style={s.subText}> {item.customer_id_number || "N/A"}</Text>
              <Text style={s.subText}> {item.county}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.subText}>{item.bike_model}</Text>
              <Text style={s.subText}>Qty: {item.quantity_interested}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.subText}> {item.payment_type}</Text>
              <Text style={s.subText}>{item.location}</Text>
            </View>
            {item.lead_notes ? (
              <Text style={s.notesText}>{item.lead_notes}</Text>
            ) : null}
            <View style={s.footerRow}>
              <Text style={s.freelancerText}>
                👤 {item.freelancers?.full_name || "Unknown"} ({item.freelancers?.freelancer_code || "N/A"})
              </Text>
              <Text style={s.dateText}>{formatDate(item.created_at)}</Text>
            </View>
            {item.duplicate_override_status !== "none" && (
              <View style={s.dupBadge}>
                <Text style={s.dupText}>
                  ⚠️ Duplicate: {item.duplicate_override_status}
                  {item.duplicate_override_reason ? ` — ${item.duplicate_override_reason}` : ""}
                </Text>
              </View>
            )}
          </View>
        ))}
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
  headerActions: { flexDirection: "row", gap: 8 },
  csvBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  csvBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  backText: { fontSize: 13, fontWeight: "500", color: "#64748b" },

  searchWrap: { marginBottom: 14 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },

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
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  nameText: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginTop: 6 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  subText: { fontSize: 12, color: "#64748b" },
  notesText: { fontSize: 12, color: "#64748b", marginTop: 6, fontStyle: "italic" },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  freelancerText: { fontSize: 11, color: "#64748b", fontWeight: "500" },
  dateText: { fontSize: 11, color: "#94a3b8" },
  dupBadge: {
    marginTop: 6,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dupText: { fontSize: 11, color: "#92400e", fontWeight: "600" },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
})