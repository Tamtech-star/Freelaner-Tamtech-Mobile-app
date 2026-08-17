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
  FlatList,
} from "react-native"
import { router } from "expo-router"
import { getPaymentRecordsLocalFirst, syncPaymentRecordsNow, type PaymentRecordRow } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"
const CSV_URL = "https://spirospares.com/api/admin/paymentrecords/csv"

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#d1fae5", text: "#065f46" },
  pending: { bg: "#fef3c7", text: "#92400e" },
  failed: { bg: "#fee2e2", text: "#991b1b" },
  approved: { bg: "#d1fae5", text: "#065f46" },
}

export default function PaymentRecordsScreen() {
  const [records, setRecords] = useState<PaymentRecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecordRow | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getPaymentRecordsLocalFirst()
      setRecords(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load payment records.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setRecords(await syncPaymentRecordsNow())
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleCsvDownload = async () => {
    try {
      await Linking.openURL(CSV_URL)
    } catch {
      Alert.alert("Error", "Could not open download link.")
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) =>
        r.payment_code.toLowerCase().includes(q) ||
        r.freelancer_name.toLowerCase().includes(q) ||
        r.transaction_reference.toLowerCase().includes(q) ||
        (r.commission_invoice?.invoice_code || "").toLowerCase().includes(q) ||
        (r.commission_invoice?.customer_name || "").toLowerCase().includes(q)
    )
  }, [records, search])

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

      <FlatList
        style={s.scroll}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_BLUE} />
        }
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={<>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Payment Records</Text>
            <Text style={s.headerSub}>{records.length} records</Text>
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
            placeholder="Search by payment code, freelancer, reference, invoice..."
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

        </>}
        ListEmptyComponent={!loading ? <Text style={s.emptyText}>{search ? "No records match your search." : "No payment records found."}</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            key={item.id}
            style={[s.card, SHADOWS.cardSm]}
            onPress={() => setSelectedRecord(item)}
            activeOpacity={0.7}
          >
            <View style={s.cardRow1}>
              <Text style={s.codeText}>{item.payment_code}</Text>
              <View style={[s.statusBadge, { backgroundColor: (STATUS_BADGE[item.payment_status] || { bg: "#f1f5f9" }).bg }]}>
                <Text style={[s.statusText, { color: (STATUS_BADGE[item.payment_status] || { text: "#475569" }).text }]}>
                  {item.payment_status}
                </Text>
              </View>
            </View>
            <Text style={s.nameText}>{item.freelancer_name}</Text>
            <View style={s.detailRow}>
              <Text style={s.subText}> {item.payment_mode}</Text>
              <Text style={s.subText}> {formatDate(item.payment_date)}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.subText}>Ref: {item.transaction_reference || "N/A"}</Text>
            </View>
            {item.commission_invoice && (
              <View style={s.invoiceRow}>
                <Text style={s.invoiceText}>
                   {item.commission_invoice.invoice_code}
                </Text>
                <Text style={s.invoiceText}>
                  CUSTOMER: {item.commission_invoice.customer_name}
                </Text>
              </View>
            )}
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Amount Paid</Text>
              <Text style={s.amountValue}>KES {fmt(item.amount_paid_kes)}</Text>
            </View>
            {item.admin_remarks ? (
              <Text style={s.remarksText}> {item.admin_remarks}</Text>
            ) : null}
            {item.acknowledgement_status && (
              <View style={s.ackRow}>
                <Text style={s.ackText}>
                  Ack: {item.acknowledgement_status}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Detail Modal */}
      <Modal visible={!!selectedRecord} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalCard}>
            <Text style={s.modalTitle}>Payment Details</Text>
            <Text style={s.modalSub}>{selectedRecord?.payment_code}</Text>

            {selectedRecord && (
              <>
                <View style={s.detailSection}>
                  <Text style={s.detailLabel}>Freelancer</Text>
                  <Text style={s.detailValue}>{selectedRecord.freelancer_name}</Text>

                  <Text style={s.detailLabel}>Payment Mode</Text>
                  <Text style={s.detailValue}>{selectedRecord.payment_mode}</Text>

                  <Text style={s.detailLabel}>Transaction Reference</Text>
                  <Text style={s.detailValue}>{selectedRecord.transaction_reference || "N/A"}</Text>

                  <Text style={s.detailLabel}>Amount Paid (KES)</Text>
                  <Text style={[s.detailValue, { color: "#10b981", fontSize: 18 }]}>
                    {fmt(selectedRecord.amount_paid_kes)}
                  </Text>

                  <Text style={s.detailLabel}>Payment Date</Text>
                  <Text style={s.detailValue}>{formatDate(selectedRecord.payment_date)}</Text>

                  <Text style={s.detailLabel}>Payment Status</Text>
                  <Text style={s.detailValue}>{selectedRecord.payment_status}</Text>

                  <Text style={s.detailLabel}>Acknowledgement</Text>
                  <Text style={s.detailValue}>{selectedRecord.acknowledgement_status || "N/A"}</Text>

                  {selectedRecord.commission_invoice && (
                    <>
                      <Text style={s.detailLabel}>Invoice</Text>
                      <Text style={s.detailValue}>{selectedRecord.commission_invoice.invoice_code}</Text>
                      <Text style={s.detailLabel}>Customer</Text>
                      <Text style={s.detailValue}>{selectedRecord.commission_invoice.customer_name}</Text>
                    </>
                  )}

                  {selectedRecord.admin_remarks ? (
                    <>
                      <Text style={s.detailLabel}>Admin Remarks</Text>
                      <Text style={s.detailValue}>{selectedRecord.admin_remarks}</Text>
                    </>
                  ) : null}
                </View>
              </>
            )}

            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setSelectedRecord(null)}
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
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invoiceText: { fontSize: 11, color: "#6366f1", fontWeight: "500" },
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
  amountValue: { fontSize: 16, fontWeight: "700", color: "#10b981" },
  remarksText: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },
  ackRow: { marginTop: 4 },
  ackText: { fontSize: 10, color: "#6366f1", fontWeight: "600" },

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
  closeBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  closeBtnText: { color: "#334155", fontSize: 13, fontWeight: "600" },
})