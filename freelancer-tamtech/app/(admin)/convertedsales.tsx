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
  Modal,
} from "react-native"
import { router } from "expo-router"
import { getConvertedSales, type ConvertedSaleRow } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"
const CSV_URL = "https://spirospares.com/api/admin/convertedsales/csv"

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#d1fae5", text: "#065f46" },
  pending: { bg: "#fef3c7", text: "#92400e" },
  failed: { bg: "#fee2e2", text: "#991b1b" },
}

export default function ConvertedSalesScreen() {
  const [sales, setSales] = useState<ConvertedSaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedSale, setSelectedSale] = useState<ConvertedSaleRow | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getConvertedSales()
      setSales(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load converted sales.")
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
    if (!search.trim()) return sales
    const q = search.toLowerCase()
    return sales.filter(
      (s) =>
        s.conversion_code.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.sales_agent_name.toLowerCase().includes(q) ||
        s.bike_model_sold.toLowerCase().includes(q) ||
        s.sales_invoice_number.toLowerCase().includes(q)
    )
  }, [sales, search])

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
            <Text style={s.headerTitle}>Converted Sales</Text>
            <Text style={s.headerSub}>{sales.length} conversions</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={handleCsvDownload} style={s.csvBtn}>
              <Text style={s.csvBtnText}>⬇ CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <TextInput
            placeholder="Search by code, customer, agent, bike, invoice..."
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
            {search ? "No sales match your search." : "No converted sales found."}
          </Text>
        )}

        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.card, SHADOWS.cardSm]}
            onPress={() => setSelectedSale(item)}
            activeOpacity={0.7}
          >
            <View style={s.cardRow1}>
              <Text style={s.codeText}>{item.conversion_code}</Text>
              <View style={[s.statusBadge, { backgroundColor: (STATUS_BADGE[item.payment_status] || { bg: "#f1f5f9" }).bg }]}>
                <Text style={[s.statusText, { color: (STATUS_BADGE[item.payment_status] || { text: "#475569" }).text }]}>
                  {item.payment_status}
                </Text>
              </View>
            </View>
            <Text style={s.nameText}>{item.customer_name}</Text>
            <View style={s.detailRow}>
              <Text style={s.subText}> {item.bike_model_sold}</Text>
              <Text style={s.subText}>Qty: {item.quantity}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.subText}> Invoice: {item.sales_invoice_number}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.subText}> Agent: {item.sales_agent_name}</Text>
              <Text style={s.subText}> {formatDate(item.sale_date)}</Text>
            </View>
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Commission</Text>
              <Text style={s.amountValue}>KES {fmt(Number(item.commission_kes) || 0)}</Text>
            </View>
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Paid</Text>
              <Text style={[s.amountValue, { color: item.paid_kes > 0 ? "#10b981" : "#ef4444" }]}>
                KES {fmt(Number(item.paid_kes) || 0)}
              </Text>
            </View>
            {item.submission_type && (
              <Text style={s.typeTag}>{item.submission_type.replace(/_/g, " ")}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedSale} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalCard}>
            <Text style={s.modalTitle}>Sale Details</Text>
            <Text style={s.modalSub}>{selectedSale?.conversion_code}</Text>

            {selectedSale && (
              <>
                <View style={s.detailSection}>
                  <Text style={s.detailLabel}>Customer</Text>
                  <Text style={s.detailValue}>{selectedSale.customer_name}</Text>

                  <Text style={s.detailLabel}>Bike Model</Text>
                  <Text style={s.detailValue}>{selectedSale.bike_model_sold}</Text>

                  <Text style={s.detailLabel}>Invoice #</Text>
                  <Text style={s.detailValue}>{selectedSale.sales_invoice_number}</Text>

                  <Text style={s.detailLabel}>Sales Agent</Text>
                  <Text style={s.detailValue}>{selectedSale.sales_agent_name}</Text>

                  <Text style={s.detailLabel}>Sale Date</Text>
                  <Text style={s.detailValue}>{formatDate(selectedSale.sale_date)}</Text>

                  <Text style={s.detailLabel}>Quantity</Text>
                  <Text style={s.detailValue}>{selectedSale.quantity}</Text>

                  <Text style={s.detailLabel}>Freelancer</Text>
                  <Text style={s.detailValue}>{selectedSale.freight || "N/A"}</Text>

                  <Text style={s.detailLabel}>Commission (KES)</Text>
                  <Text style={s.detailValue}>{fmt(Number(selectedSale.commission_kes) || 0)}</Text>

                  <Text style={s.detailLabel}>Paid (KES)</Text>
                  <Text style={[s.detailValue, { color: selectedSale.paid_kes > 0 ? "#10b981" : "#ef4444" }]}>
                    {fmt(Number(selectedSale.paid_kes) || 0)}
                  </Text>

                  <Text style={s.detailLabel}>Payment Status</Text>
                  <Text style={s.detailValue}>{selectedSale.payment_status}</Text>

                  <Text style={s.detailLabel}>Submission Type</Text>
                  <Text style={s.detailValue}>{selectedSale.submission_type.replace(/_/g, " ")}</Text>
                </View>

                {/* Document links */}
                {selectedSale.invoice_photo_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() => Linking.openURL(selectedSale.invoice_photo_url!)}
                  >
                    <Text style={s.docLinkText}>📎 Invoice Photo</Text>
                  </TouchableOpacity>
                )}
                {selectedSale.agreement_photo_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() => Linking.openURL(selectedSale.agreement_photo_url!)}
                  >
                    <Text style={s.docLinkText}>📎 Sales Agreement</Text>
                  </TouchableOpacity>
                )}
                {selectedSale.id_doc_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() => Linking.openURL(selectedSale.id_doc_url!)}
                  >
                    <Text style={s.docLinkText}>📎 ID Document</Text>
                  </TouchableOpacity>
                )}
                {selectedSale.kra_doc_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() => Linking.openURL(selectedSale.kra_doc_url!)}
                  >
                    <Text style={s.docLinkText}>📎 KRA Document</Text>
                  </TouchableOpacity>
                )}
                {selectedSale.bike_photo_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() => Linking.openURL(selectedSale.bike_photo_url!)}
                  >
                    <Text style={s.docLinkText}>📎 Bike Photo</Text>
                  </TouchableOpacity>
                )}
                {selectedSale.chassis_photo_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() => Linking.openURL(selectedSale.chassis_photo_url!)}
                  >
                    <Text style={s.docLinkText}>📎 Chassis Photo</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setSelectedSale(null)}
            >
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  amountLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase" },
  amountValue: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  typeTag: {
    marginTop: 6,
    fontSize: 10,
    color: "#6366f1",
    fontWeight: "600",
    textTransform: "uppercase",
    backgroundColor: "#eef2ff",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#64748b", marginBottom: 16, fontFamily: "monospace" },
  detailSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  detailLabel: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginTop: 8 },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginTop: 2 },
  docLink: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    marginBottom: 6,
  },
  docLinkText: { fontSize: 13, fontWeight: "600", color: BRAND_BLUE },
  closeBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  closeBtnText: { color: "#334155", fontSize: 13, fontWeight: "600" },
})