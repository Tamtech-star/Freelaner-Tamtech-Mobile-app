import { useState, useCallback, useEffect, useMemo } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { Download } from "lucide-react-native"
import {
  getConversionRatioLocalFirst,
  getCountyWiseLocalFirst,
  getReconciliationLocalFirst,
  getFreelancerReportLocalFirst,
  syncConversionRatioNow,
  syncCountyWiseNow,
  syncReconciliationNow,
  syncFreelancerReportNow,
  type ConversionRatio,
  type CountyWiseItem,
  type ReconciliationResponse,
  type FreelancerReportRow,
} from "../../src/api/admin"
import { getFreelancerDetails, type LeadCardItem } from "../../src/api/portal"
import { COLORS, SHADOWS } from "../../src/constants/config"
import { createFreelancerReportCsv } from "../../src/utils/freelancerReportCsv"
import { createFreelancerLeadsCsv } from "../../src/utils/freelancerLeadsCsv"
import { downloadCsvFile } from "../../src/utils/csvDownload"

const BRAND_BLUE = "#2881FA"

type Tab = "conversion" | "county" | "reconciliation"

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return d || "—"
  }
}

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("conversion")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [ratio, setRatio] = useState<ConversionRatio | null>(null)
  const [counties, setCounties] = useState<CountyWiseItem[]>([])
  const [recon, setRecon] = useState<ReconciliationResponse | null>(null)

  // Freelancer Report states
  const [showFreelancerReport, setShowFreelancerReport] = useState(false)
  const [freelancerRows, setFreelancerRows] = useState<FreelancerReportRow[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSearch, setReportSearch] = useState("")
  const [downloadingReport, setDownloadingReport] = useState(false)

  // Freelancer detail modal states
  const [selectedFreelancer, setSelectedFreelancer] = useState<FreelancerReportRow | null>(null)
  const [leads, setLeads] = useState<LeadCardItem[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [downloadingLeads, setDownloadingLeads] = useState(false)

  const loadConversionTab = useCallback(async () => {
    try {
      setError(null)
      const data = await getConversionRatioLocalFirst()
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
      const data = await getCountyWiseLocalFirst()
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
      const data = await getReconciliationLocalFirst()
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
    try {
      if (activeTab === "conversion") setRatio(await syncConversionRatioNow())
      if (activeTab === "county") setCounties(await syncCountyWiseNow())
      if (activeTab === "reconciliation") setRecon(await syncReconciliationNow())
    } finally {
      setRefreshing(false)
    }
  }, [activeTab])

  // ── Freelancer Report ──
  const openFreelancerReport = useCallback(async () => {
    setShowFreelancerReport(true)
    setReportError(null)
    setReportLoading(true)
    try {
      setFreelancerRows(await getFreelancerReportLocalFirst())
    } catch (err: any) {
      setReportError(err?.response?.data?.error || err?.message || "Failed to load freelancer report.")
    } finally {
      setReportLoading(false)
    }
  }, [])

  const refreshFreelancerReport = useCallback(async () => {
    setReportError(null)
    setReportLoading(true)
    try {
      setFreelancerRows(await syncFreelancerReportNow())
    } catch (err: any) {
      setReportError(err?.response?.data?.error || err?.message || "Failed to sync freelancer report.")
    } finally {
      setReportLoading(false)
    }
  }, [])

  const openFreelancerDetails = useCallback(async (freelancer: FreelancerReportRow) => {
    setSelectedFreelancer(freelancer)
    setLeads([])
    setLeadsError(null)
    setLeadsLoading(true)
    try {
      const data = await getFreelancerDetails(freelancer.freelancer_code)
      setLeads(data.leads || [])
    } catch (err: any) {
      setLeadsError(err?.response?.data?.error || err?.message || "Failed to load leads.")
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  const filteredReportRows = useMemo(() => {
    if (!reportSearch.trim()) return freelancerRows
    const q = reportSearch.toLowerCase()
    return freelancerRows.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        (f.mpesa_phone || "").toLowerCase().includes(q) ||
        (f.freelancer_code || "").toLowerCase().includes(q) ||
        (f.display_code || "").toLowerCase().includes(q)
    )
  }, [freelancerRows, reportSearch])

  const handleDownloadReport = async () => {
    if (filteredReportRows.length === 0) return
    setDownloadingReport(true)
    try {
      await downloadCsvFile(createFreelancerReportCsv(filteredReportRows), "Freelancer Report")
    } catch (err: any) {
      Alert.alert("Download Failed", err?.message || "Could not create the freelancer report CSV.")
    } finally {
      setDownloadingReport(false)
    }
  }

  const handleDownloadLeads = async () => {
    if (!selectedFreelancer) return
    setDownloadingLeads(true)
    try {
      await downloadCsvFile(createFreelancerLeadsCsv(leads), `Leads - ${selectedFreelancer.full_name}`)
    } catch (err: any) {
      Alert.alert("Download Failed", err?.message || "Could not create the leads CSV.")
    } finally {
      setDownloadingLeads(false)
    }
  }

  const TabBtn = ({ tab, label }: { tab: Tab; label: string }) => (
    <TouchableOpacity
      style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  const fmt = (n: number) => (n ?? 0).toLocaleString()

  return (
    <View style={s.container}>
      <View style={s.brandBar}>
        <Text style={s.brandText}></Text>
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
        {activeTab === "conversion" && !showFreelancerReport && (
          <View style={s.section}>
            <TouchableOpacity
              style={[s.bigCard, s.reportCard]}
              onPress={() => { void openFreelancerReport() }}
              activeOpacity={0.7}
            >
              <View style={s.reportCardTop}>
                <Text style={s.bigLabel}>Freelancer Report</Text>
                <Text style={s.reportCardArrow}>→</Text>
              </View>
              <Text style={s.reportCardDesc}>View freelancer details, leads and commissions</Text>
            </TouchableOpacity>
            <View style={[s.bigCard, { borderLeftColor: "#10b981" }]}>
              <Text style={s.bigLabel}>Conversion Ratio</Text>
              <Text style={[s.bigValue, { color: "#10b981" }]}>{ratio?.conversionRatio ?? 0}%</Text>
            </View>
          </View>
        )}

        {/* Freelancer Report list view */}
        {activeTab === "conversion" && showFreelancerReport && (
          <View style={s.section}>
            <View style={s.reportHeader}>
              <TouchableOpacity onPress={() => setShowFreelancerReport(false)} style={s.backBtn}>
                <Text style={s.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={s.reportTitle}>Freelancer Report</Text>
              <TouchableOpacity
                onPress={() => { void handleDownloadReport() }}
                disabled={downloadingReport || filteredReportRows.length === 0}
                style={[s.csvBtn, (downloadingReport || filteredReportRows.length === 0) && s.disabledBtn]}
              >
                {downloadingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Download size={16} color="#fff" />
                )}
                <Text style={s.csvBtnText}>{downloadingReport ? "Preparing" : "CSV"}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.searchWrap}>
              <TextInput
                placeholder="Search by name, phone or code..."
                placeholderTextColor="#94a3b8"
                value={reportSearch}
                onChangeText={setReportSearch}
                style={s.searchInput}
              />
            </View>

            {reportError && (
              <View style={s.errorWrap}>
                <Text style={s.errorText}>{reportError}</Text>
                <TouchableOpacity onPress={() => { void refreshFreelancerReport() }} style={s.retryBtn}>
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {reportLoading ? (
              <View style={s.centerWrap}>
                <ActivityIndicator size="large" color={COLORS.gradientStart} />
              </View>
            ) : filteredReportRows.length === 0 ? (
              <Text style={s.emptyText}>
                {reportSearch ? "No freelancers match your search." : "No freelancers found."}
              </Text>
            ) : (
              filteredReportRows.map((f) => (
                <TouchableOpacity
                  key={f.freelancer_id}
                  style={[s.card, SHADOWS.cardSm]}
                  onPress={() => { void openFreelancerDetails(f) }}
                  activeOpacity={0.7}
                >
                  <View style={s.cardRow1}>
                    <Text style={s.nameText}>{f.full_name}</Text>
                    <Text style={s.ratioText}>{f.converted_sales ?? 0} sales</Text>
                  </View>
                  <Text style={s.subText}>📞 {f.mpesa_phone || "N/A"}</Text>
                  <Text style={s.subText}>📅 {formatDate(f.created_at)}</Text>
                  <View style={s.cardRow1}>
                    <Text style={s.subText}>{fmt(f.total_leads)} leads</Text>
                    <Text style={s.subText}>{fmt(f.paid_commissions)} paid</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
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

      {/* Freelancer Detail Modal */}
      <Modal visible={!!selectedFreelancer} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.modalHeaderText}>
                <Text style={s.modalTitle}>Freelancer Details</Text>
                {selectedFreelancer && (
                  <Text style={s.modalSub}>
                    {selectedFreelancer.display_code || selectedFreelancer.freelancer_code}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={s.headerCloseBtn}
                onPress={() => setSelectedFreelancer(null)}
                accessibilityRole="button"
                accessibilityLabel="Close freelancer details"
              >
                <Text style={s.headerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.modalScroll}
              contentContainerStyle={s.modalScrollContent}
              showsVerticalScrollIndicator
            >
              {selectedFreelancer && (
                <>
                  <View style={s.detailSection}>
                    <Text style={s.detailLabel}>Full Name</Text>
                    <Text style={s.detailValue}>{selectedFreelancer.full_name}</Text>

                    <Text style={s.detailLabel}>Phone Number</Text>
                    <Text style={s.detailValue}>{selectedFreelancer.mpesa_phone || "N/A"}</Text>

                    <Text style={s.detailLabel}>Created</Text>
                    <Text style={s.detailValue}>{formatDate(selectedFreelancer.created_at)}</Text>

                    <Text style={s.detailLabel}>Freelancer Code</Text>
                    <Text style={s.detailValue}>{selectedFreelancer.freelancer_code}</Text>
                  </View>

                  <View style={s.metricsSection}>
                    <Text style={s.metricsTitle}>Performance Overview</Text>
                    <View style={s.metricsGrid}>
                      <MetricCard label="Total Leads" value={selectedFreelancer.total_leads} color="#0f172a" />
                      <MetricCard label="Quantity Sold" value={selectedFreelancer.quantity_sold} color="#2563eb" />
                      <MetricCard label="Converted Sales" value={selectedFreelancer.converted_sales} color="#059669" />
                      <MetricCard label="Paid Commissions" value={selectedFreelancer.paid_commissions} color="#059669" />
                      <MetricCard label="Total Paid (KES)" value={selectedFreelancer.total_paid_kes} color="#059669" />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[s.leadsCsvBtn, (downloadingLeads || leads.length === 0) && s.disabledBtn]}
                    onPress={() => { void handleDownloadLeads() }}
                    disabled={downloadingLeads || leads.length === 0}
                  >
                    {downloadingLeads ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Download size={16} color="#fff" />
                    )}
                    <Text style={s.leadsCsvBtnText}>
                      {downloadingLeads ? "Preparing..." : "Download Leads CSV"}
                    </Text>
                  </TouchableOpacity>

                  {leadsLoading && (
                    <View style={s.metricsLoading}>
                      <ActivityIndicator size="small" color={COLORS.gradientStart} />
                      <Text style={s.metricsLoadingText}>Loading leads...</Text>
                    </View>
                  )}
                  {leadsError && !leadsLoading && <Text style={s.metricsError}>{leadsError}</Text>}
                  {!leadsLoading && !leadsError && leads.length === 0 && (
                    <Text style={s.emptyText}>No leads found for this freelancer.</Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.metricCard}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, { color }]}>{(value ?? 0).toLocaleString()}</Text>
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

  reportCard: { borderLeftColor: "#6366f1" },
  reportCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportCardArrow: { fontSize: 20, fontWeight: "800", color: "#6366f1" },
  reportCardDesc: { marginTop: 8, fontSize: 13, color: "#64748b" },

  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reportTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", flex: 1, textAlign: "center" },
  csvBtn: {
    minWidth: 82,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  csvBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  disabledBtn: { opacity: 0.5 },

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
  nameText: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  ratioText: { fontSize: 14, fontWeight: "800", color: "#10b981" },
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  modalHeaderText: { flex: 1, paddingRight: 12 },
  modalScroll: { paddingHorizontal: 20 },
  modalScrollContent: { paddingTop: 14, paddingBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  modalSub: { fontSize: 12, color: "#64748b", marginTop: 3, fontFamily: "monospace" },
  headerCloseBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  headerCloseText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  detailSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  detailLabel: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginTop: 8 },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginTop: 2 },
  metricsSection: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  metricsTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 10 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { width: "48%", minHeight: 66, backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  metricLabel: { fontSize: 10, color: "#64748b", textTransform: "uppercase" },
  metricValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  metricsLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  metricsLoadingText: { fontSize: 12, color: "#64748b" },
  metricsError: { fontSize: 12, color: "#dc2626", paddingVertical: 8 },
  leadsCsvBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  leadsCsvBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
})
