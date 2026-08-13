import { useState, useCallback, useEffect, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Modal,
  Alert,
} from "react-native"
import { Download } from "lucide-react-native"
import { router, useLocalSearchParams } from "expo-router"
import { getAllSalesLocalFirst, getConvertedSalesLocalFirst, syncAllSalesNow, syncConvertedSalesNow, type ConvertedSaleRow } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"
import { formatPaymentMode, getFreelancerName } from "../../src/utils/salesDisplay"
import { subscribeToOfflineData } from "../../src/offline/syncWorker"
import { downloadSalesCsv } from "../../src/utils/salesCsvDownload"
import { SalesDateFilterControl } from "../../src/components/SalesDateFilterControl"
import { applySalesDateFilter, DEFAULT_SALES_DATE_FILTER, type SalesDateFilter } from "../../src/utils/salesDateFilter"

const BRAND_BLUE = "#2881FA"

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#d1fae5", text: "#065f46" },
  pending: { bg: "#fef3c7", text: "#92400e" },
  failed: { bg: "#fee2e2", text: "#991b1b" },
}

export default function SalesListScreen() {
  const { filter } = useLocalSearchParams<{ filter: string }>()
  const [sales, setSales] = useState<ConvertedSaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [agentSearch, setAgentSearch] = useState("")
  const [selectedSale, setSelectedSale] = useState<ConvertedSaleRow | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [dateFilter, setDateFilter] = useState<SalesDateFilter>(DEFAULT_SALES_DATE_FILTER)

  const isFreelancer = filter === "freelancer"

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = isFreelancer ? await getConvertedSalesLocalFirst() : await getAllSalesLocalFirst()
      // Apply submission type filter
      let filtered = data
      if (isFreelancer) {
        filtered = data.filter((s) => s.submission_type === "freelancer_lead")
      } else if (filter === "direct") {
        filtered = data.filter((s) => s.submission_type === "direct_sale")
      }
      setSales(filtered)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load sales.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, isFreelancer])

  useEffect(() => {
    load()
    return subscribeToOfflineData(load)
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = isFreelancer ? await syncConvertedSalesNow() : await syncAllSalesNow()
      const filtered = isFreelancer
        ? data.filter((sale) => sale.submission_type === "freelancer_lead")
        : filter === "direct"
          ? data.filter((sale) => sale.submission_type === "direct_sale")
          : data
      setSales(filtered)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to sync sales.")
    } finally {
      setRefreshing(false)
    }
  }, [filter, isFreelancer])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return d || ""
    }
  }

  // Collect unique agent names for the quick-filter chips
  const agentNames = useMemo(() => {
    const names = new Set<string>()
    sales.forEach((s) => {
      if (s.sales_agent_name) names.add(s.sales_agent_name.trim())
    })
    return Array.from(names).sort()
  }, [sales])

  // Filter by search text + agent search
  const filtered = useMemo(() => {
    let result = applySalesDateFilter(sales, dateFilter)

    // Agent filter
    if (agentSearch.trim()) {
      const agentQ = agentSearch.toLowerCase()
      result = result.filter((s) =>
        (s.sales_agent_name || "").toLowerCase().includes(agentQ)
      )
    }

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.conversion_code.toLowerCase().includes(q) ||
          s.customer_name.toLowerCase().includes(q) ||
          s.sales_agent_name.toLowerCase().includes(q) ||
          s.bike_model_sold.toLowerCase().includes(q) ||
          s.sales_invoice_number.toLowerCase().includes(q)
      )
    }

    return result
  }, [sales, search, agentSearch, dateFilter])

  const getTitle = () => {
    if (isFreelancer) return "Freelancer Lead Sales"
    if (filter === "direct") return "Direct Sales"
    return "Total Sales"
  }

  const handleDownloadCsv = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadSalesCsv(filtered, getTitle())
    } catch (err: any) {
      Alert.alert("Download Failed", err?.message || "Could not create the sales CSV file.")
    } finally {
      setDownloading(false)
    }
  }, [filtered, filter, isFreelancer])

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
            <Text style={s.headerTitle}>{getTitle()}</Text>
            <Text style={s.headerSub}>{sales.length} records</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={handleDownloadCsv} style={[s.downloadBtn, (downloading || filtered.length === 0) && s.disabledBtn]} disabled={downloading || filtered.length === 0}>
              {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Download size={16} color="#fff" />}
              <Text style={s.downloadText}>{downloading ? "Preparing" : "CSV"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text Search */}
        <View style={s.searchWrap}>
          <TextInput
            placeholder="Search by code, customer, agent, bike, invoice..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
          />
        </View>

        {/* Agent Filter */}
        <View style={s.agentSection}>
          <Text style={s.agentLabel}>Filter by Agent</Text>
          <View style={s.agentInputRow}>
            <TextInput
              placeholder="Type agent name (e.g. Mary, Japheth)..."
              placeholderTextColor="#94a3b8"
              value={agentSearch}
              onChangeText={setAgentSearch}
              style={s.agentInput}
            />
            {agentSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAgentSearch("")} style={s.clearAgentBtn}>
                <Text style={s.clearAgentText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Quick-select chips */}
          {agentNames.length > 0 && agentSearch.length === 0 && (
            <View style={s.chipRow}>
              {agentNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={s.chip}
                  onPress={() => setAgentSearch(name)}
                >
                  <Text style={s.chipText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Filtered count */}
          {agentSearch.length > 0 && (
            <Text style={s.filterTag}>
              Showing {filtered.length} sale{filtered.length !== 1 ? "s" : ""} by "{agentSearch}"
            </Text>
          )}
        </View>

        <View style={s.dateFilterWrap}>
          <SalesDateFilterControl value={dateFilter} onChange={setDateFilter} availableDates={sales.map((sale) => sale.sale_date)} />
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
            {search || agentSearch
              ? "No sales match your filters."
              : "No sales found."}
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
              <Text style={s.amountLabel}>Freelancer Name</Text>
              <Text style={s.amountValue}>{getFreelancerName(item)}</Text>
            </View>
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Payment Mode</Text>
              <Text style={s.amountValue}>{formatPaymentMode(item.payment_type)}</Text>
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
          <View style={s.modalCard}>
            <ScrollView style={s.modalScroll} contentContainerStyle={{ paddingBottom: 12 }}>
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
                    <Text style={s.detailLabel}>Freight</Text>
                    <Text style={s.detailValue}>{selectedSale.freight || "N/A"}</Text>
                    <Text style={s.detailLabel}>Freelancer Name</Text>
                    <Text style={s.detailValue}>{getFreelancerName(selectedSale)}</Text>
                    <Text style={s.detailLabel}>Payment Mode</Text>
                    <Text style={s.detailValue}>{formatPaymentMode(selectedSale.payment_type)}</Text>
                    <Text style={s.detailLabel}>Payment Status</Text>
                    <Text style={s.detailValue}>{selectedSale.payment_status}</Text>
                    <Text style={s.detailLabel}>Submission Type</Text>
                    <Text style={s.detailValue}>{selectedSale.submission_type.replace(/_/g, " ")}</Text>
                  </View>

                  {selectedSale.invoice_photo_url && (
                    <TouchableOpacity style={s.docLink} onPress={() => Linking.openURL(selectedSale.invoice_photo_url!)}>
                      <Text style={s.docLinkText}>📎 Invoice Photo</Text>
                    </TouchableOpacity>
                  )}
                  {selectedSale.agreement_photo_url && (
                    <TouchableOpacity style={s.docLink} onPress={() => Linking.openURL(selectedSale.agreement_photo_url!)}>
                      <Text style={s.docLinkText}>📎 Sales Agreement</Text>
                    </TouchableOpacity>
                  )}
                  {selectedSale.id_doc_url && (
                    <TouchableOpacity style={s.docLink} onPress={() => Linking.openURL(selectedSale.id_doc_url!)}>
                      <Text style={s.docLinkText}>📎 ID Document</Text>
                    </TouchableOpacity>
                  )}
                  {selectedSale.kra_doc_url && (
                    <TouchableOpacity style={s.docLink} onPress={() => Linking.openURL(selectedSale.kra_doc_url!)}>
                      <Text style={s.docLinkText}>📎 KRA Document</Text>
                    </TouchableOpacity>
                  )}
                  {selectedSale.bike_photo_url && (
                    <TouchableOpacity style={s.docLink} onPress={() => Linking.openURL(selectedSale.bike_photo_url!)}>
                      <Text style={s.docLinkText}>📎 Bike Photo</Text>
                    </TouchableOpacity>
                  )}
                  {selectedSale.chassis_photo_url && (
                    <TouchableOpacity style={s.docLink} onPress={() => Linking.openURL(selectedSale.chassis_photo_url!)}>
                      <Text style={s.docLinkText}>📎 Chassis Photo</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedSale(null)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 16 },
  headerLeft: { flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  headerSub: { marginTop: 4, fontSize: 13, color: "#64748b" },
  backBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  backText: { fontSize: 13, fontWeight: "500", color: "#64748b" },
  downloadBtn: { minWidth: 82, height: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, backgroundColor: "#059669", paddingHorizontal: 12 },
  downloadText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  disabledBtn: { opacity: 0.5 },

  searchWrap: { marginBottom: 10 },
  searchInput: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#0f172a" },

  // Agent filter
  agentSection: { marginBottom: 14 },
  agentLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: 6 },
  agentInputRow: { flexDirection: "row", alignItems: "center" },
  agentInput: { flex: 1, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#0f172a" },
  clearAgentBtn: { marginLeft: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  clearAgentText: { fontSize: 14, color: "#64748b", fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#bfdbfe" },
  chipText: { fontSize: 12, color: BRAND_BLUE, fontWeight: "600" },
  filterTag: { fontSize: 11, color: "#10b981", marginTop: 6, fontWeight: "600" },
  dateFilterWrap: { marginBottom: 14 },

  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, marginBottom: 10 },
  cardRow1: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codeText: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", color: BRAND_BLUE },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  nameText: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginTop: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  subText: { fontSize: 12, color: "#64748b" },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  amountLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase" },
  amountValue: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  typeTag: { marginTop: 6, fontSize: 10, color: "#6366f1", fontWeight: "600", textTransform: "uppercase", backgroundColor: "#eef2ff", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: BRAND_BLUE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, maxHeight: "85%" },
  modalScroll: { flex: 0 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#64748b", marginBottom: 16, fontFamily: "monospace" },
  detailSection: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 12 },
  detailLabel: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginTop: 8 },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginTop: 2 },
  docLink: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#eff6ff", borderRadius: 8, marginBottom: 6 },
  docLinkText: { fontSize: 13, fontWeight: "600", color: BRAND_BLUE },
  closeBtn: { backgroundColor: "#f1f5f9", paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 12 },
  closeBtnText: { color: "#334155", fontSize: 14, fontWeight: "600" },
})