import { useState, useCallback, useMemo, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { useAuthStore } from "../../src/store/authStore"
import { fetchSalesHistory, type SalesRecordItem } from "../../src/api/salesRecord"
import { COLORS, SHADOWS } from "../../src/constants/config"

// Types
type SaleRecordRow = SalesRecordItem

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#d1fae5", text: "#065f46" },
  approved: { bg: "#d1fae5", text: "#065f46" },
  submitted: { bg: "#dbeafe", text: "#1e40af" },
  converted: { bg: "#dbeafe", text: "#1e40af" },
  pending: { bg: "#fef3c7", text: "#92400e" },
}

const DOCUMENT_LABELS: Record<string, string> = {
  invoice_photo_url: "Invoice Photo",
  agreement_photo_url: "Sales Agreement",
  id_doc_url: "ID Document",
  kra_doc_url: "KRA Document",
  bike_photo_url: "Bike Photo",
  chassis_photo_url: "Chassis Photo",
}

export default function SalesRecordHome() {
  const { user, logout } = useAuthStore()
  const [rows, setRows] = useState<SaleRecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedRow, setSelectedRow] = useState<SaleRecordRow | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadHistory = useCallback(async () => {
    try {
      setLoadError(null)
      const items = await fetchSalesHistory()
      setRows(items)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to load sales history."
      setLoadError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadHistory()
  }, [loadHistory])

  // Reload when history modal opens
  useEffect(() => {
    if (historyOpen) {
      loadHistory()
    }
  }, [historyOpen])

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.customer_name.toLowerCase().includes(q) ||
        r.conversion_code.toLowerCase().includes(q) ||
        r.sales_invoice_number.toLowerCase().includes(q) ||
        r.bike_model_sold.toLowerCase().includes(q) ||
        r.sales_agent_name.toLowerCase().includes(q) ||
        r.freight.toLowerCase().includes(q)
    )
  }, [rows, search])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return d
    }
  }

  const statusBg = (key: string) => STATUS_STYLES[key]?.bg || "#f1f5f9"
  const statusText = (key: string) => STATUS_STYLES[key]?.text || "#475569"

  return (
    <View style={s.container}>
      {/* Brand Bar */}
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
        {/* Header with agent name + logout */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Sales Record</Text>
            <Text style={s.headerSub}>
              Record a sale from an open lead or add a direct sale
            </Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.agentBadge}>
              <Text style={s.agentBadgeText}>{user?.name || "Agent"}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
              <Text style={s.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Two Entry Cards */}
        <View style={s.cardRow}>
          {/* Card 1: Record Sales */}
          <TouchableOpacity
            onPress={() => router.push("/(sales-record)/form")}
            style={[s.entryCard, SHADOWS.cardSm]}
          >
            <Text style={s.entryLabel}>Record Sales</Text>
            <Text style={s.entryDesc}>
              Submit a direct sale or convert an open freelancer lead
            </Text>
            <View style={s.entryBtn}>
              <Text style={s.entryBtnText}>Proceed to Sales Record →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Sales Record History */}
          <TouchableOpacity
            onPress={() => setHistoryOpen(true)}
            style={[s.entryCard, SHADOWS.cardSm]}
          >
            <Text style={s.entryLabel}>Sales Record History</Text>
            <Text style={s.entryDesc}>
              Click to view all recorded sales (direct sales & freelancer conversions)
            </Text>
            <View style={[s.entryBtn, { backgroundColor: "#d1fae5" }]}>
              <Text style={[s.entryBtnText, { color: "#065f46" }]}>View History →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick summary of recent records */}
        {!loading && rows.length > 0 && (
          <View style={s.recentSection}>
            <Text style={s.recentTitle}>Recent Sales ({rows.length} total)</Text>
            {rows.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedRow(item)}
                style={[s.historyCard, SHADOWS.cardSm, { marginBottom: 8 }]}
              >
                <View style={s.histRow1}>
                  <Text style={s.conversionCode}>{item.conversion_code}</Text>
                  <View style={[s.typeBadge, { backgroundColor: statusBg(item.payment_status) }]}>
                    <Text style={[s.typeBadgeText, { color: statusText(item.payment_status) }]}>
                      {item.submission_type === "direct_sale" ? "Direct Sale" : "Freelancer Lead"}
                    </Text>
                  </View>
                </View>
                <Text style={s.customerName}>{item.customer_name}</Text>
                <View style={s.histRow2}>
                  <Text style={s.invoiceNum}>#{item.sales_invoice_number}</Text>
                  <Text style={s.bikeModel}>{item.bike_model_sold}</Text>
                  <Text style={s.qtyText}>Qty: {item.quantity}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading state */}
        {loading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.gradientStart} />
            <Text style={s.loadingText}>Loading sales records...</Text>
          </View>
        )}

        {/* Error state */}
        {loadError && (
          <View style={s.errorWrap}>
            <Text style={s.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={loadHistory} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/*  History Modal  */}
      <Modal visible={historyOpen} animationType="slide">
        <View style={s.modalScreen}>
          {/* Modal Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Sales Record History</Text>
            <TouchableOpacity
              onPress={() => {
                setHistoryOpen(false)
                setSelectedRow(null)
                setSearch("")
              }}
              style={s.modalCloseBtn}
            >
              <Text style={s.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={s.searchWrap}>
            <TextInput
              placeholder="Search by customer name, code, invoice..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
            />
          </View>

          {/* Count */}
          <View style={s.countWrap}>
            <Text style={s.countText}>Total records: {filteredRows.length}</Text>
          </View>

          {/* List */}
          {filteredRows.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>
                {search ? "No records match your search." : "No sales records found."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedRow(item)}
                  style={[s.historyCard, SHADOWS.cardSm]}
                >
                  {/* Row 1: Code + Type Badge */}
                  <View style={s.histRow1}>
                    <Text style={s.conversionCode}>{item.conversion_code}</Text>
                    <View style={[s.typeBadge, { backgroundColor: statusBg(item.payment_status) }]}>
                      <Text style={[s.typeBadgeText, { color: statusText(item.payment_status) }]}>
                        {item.submission_type === "direct_sale" ? "Direct Sale" : "Freelancer Lead"}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: Customer + Invoice */}
                  <Text style={s.customerName}>{item.customer_name}</Text>
                  <View style={s.histRow2}>
                    <Text style={s.invoiceNum}>#{item.sales_invoice_number}</Text>
                    <Text style={s.bikeModel}>{item.bike_model_sold}</Text>
                    <Text style={s.qtyText}>Qty: {item.quantity}</Text>
                  </View>

                  {/* Row 3: Date + Agent + Status */}
                  <View style={s.histRow3}>
                    <Text style={s.dateText}>{formatDate(item.sale_date)}</Text>
                    <View style={s.histRight}>
                      <Text style={s.agentName}>{item.sales_agent_name}</Text>
                      <View style={[s.statusBadge, { backgroundColor: statusBg(item.payment_status) }]}>
                        <Text style={[s.statusBadgeText, { color: statusText(item.payment_status) }]}>
                          {item.payment_status || "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/*  Detail Modal  */}
      <Modal visible={!!selectedRow} animationType="fade" transparent>
        <View style={s.detailOverlay}>
          <View style={s.detailCard}>
            {selectedRow && (
              <>
                <Text style={s.detailTitle}>{selectedRow.conversion_code}</Text>

                <View style={s.detailBody}>
                  <DetailRow label="Type" value={selectedRow.submission_type === "direct_sale" ? "Direct Sale" : "Freelancer Lead"} />
                  <DetailRow label="Customer" value={selectedRow.customer_name} />
                  <DetailRow label="Freelancer" value={selectedRow.freight} />
                  <DetailRow label="Agent" value={selectedRow.sales_agent_name} />
                  <DetailRow label="Invoice" value={selectedRow.sales_invoice_number} />
                  <DetailRow label="Bike" value={selectedRow.bike_model_sold} />
                  <DetailRow label="Date" value={formatDate(selectedRow.sale_date)} />
                  <DetailRow label="Qty" value={String(selectedRow.quantity)} />
                  <DetailRow label="Commission" value={selectedRow.commission_kes} />
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Status: </Text>
                    <View style={[s.statusBadge, { backgroundColor: statusBg(selectedRow.payment_status) }]}>
                      <Text style={[s.statusBadgeText, { color: statusText(selectedRow.payment_status) }]}>
                        {selectedRow.payment_status || "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Documents */}
                {(() => {
                  const docs = [
                    { key: "invoice_photo_url", url: selectedRow.invoice_photo_url },
                    { key: "agreement_photo_url", url: selectedRow.agreement_photo_url },
                    { key: "id_doc_url", url: selectedRow.id_doc_url },
                    { key: "kra_doc_url", url: selectedRow.kra_doc_url },
                    { key: "bike_photo_url", url: selectedRow.bike_photo_url },
                    { key: "chassis_photo_url", url: selectedRow.chassis_photo_url },
                  ].filter(d => d.url)
                  if (docs.length === 0) return null
                  return (
                    <View style={s.documentsSection}>
                      <Text style={s.documentsTitle}>Documents ({docs.length})</Text>
                      {docs.map(doc => (
                        <TouchableOpacity
                          key={doc.key}
                          style={s.docLink}
                          onPress={() => Linking.openURL(doc.url!)}
                        >
                          <Text style={s.docLinkIcon}>📎</Text>
                          <Text style={s.docLinkText} numberOfLines={1}>
                            {DOCUMENT_LABELS[doc.key] || doc.key}
                          </Text>
                          <Text style={s.docLinkArrow}>↗</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                })()}

                <TouchableOpacity
                  onPress={() => setSelectedRow(null)}
                  style={s.closeBtn}
                >
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

//  DetailRow helper 
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}: </Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  )
}

//  Styles 
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
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
    marginBottom: 24,
  },
  headerLeft: { flex: 1, paddingRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  headerSub: { marginTop: 4, fontSize: 14, color: "#64748b" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  agentBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  agentBadgeText: { fontSize: 14, fontWeight: "700", color: "#1d4ed8" },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { fontSize: 12, fontWeight: "500", color: "#64748b" },

  cardRow: { gap: 16 },
  entryCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 20,
  },
  entryLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" },
  entryDesc: { marginTop: 8, fontSize: 14, color: "#475569", lineHeight: 20 },
  entryBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  entryBtnText: { fontSize: 12, fontWeight: "700", color: "#1d4ed8" },

  // Recent section
  recentSection: { marginTop: 24 },
  recentTitle: { fontSize: 14, fontWeight: "700", color: "#334155", marginBottom: 10 },

  // Loading / Error states
  loadingWrap: { marginTop: 32, alignItems: "center" },
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

  // History Modal
  modalScreen: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  modalCloseBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalCloseText: { fontSize: 12, fontWeight: "500", color: "#64748b" },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },

  countWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  countText: { fontSize: 12, color: "#64748b" },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: "#64748b" },

  historyCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
  },
  histRow1: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  conversionCode: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", color: "#1d4ed8" },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  customerName: { marginTop: 4, fontSize: 14, fontWeight: "600", color: "#1e293b" },
  histRow2: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 12 },
  invoiceNum: { fontFamily: "monospace", fontSize: 12, color: "#64748b" },
  bikeModel: { fontSize: 12, color: "#64748b" },
  qtyText: { fontSize: 12, color: "#64748b" },
  histRow3: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { fontSize: 12, color: "#94a3b8" },
  histRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  agentName: { fontSize: 12, color: "#94a3b8" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },

  // Detail Modal
  detailOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 16,
  },
  detailCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  detailTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  detailBody: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  detailLabel: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  detailValue: { fontSize: 14, color: "#334155" },
  closeBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: "#334155" },

  // Documents section
  documentsSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  docLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  docLinkIcon: { fontSize: 16, marginRight: 8 },
  docLinkText: {
    flex: 1,
    fontSize: 14,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  docLinkArrow: { fontSize: 14, color: "#94a3b8" },
})
