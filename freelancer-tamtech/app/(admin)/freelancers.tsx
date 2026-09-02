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
  Modal,
  StyleSheet,
  FlatList,
} from "react-native"
import { Download } from "lucide-react-native"
import { router } from "expo-router"
import { getFreelancersLocalFirst, syncFreelancersNow, deleteFreelancer, type FreelancerRow } from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"
import { subscribeToOfflineData } from "../../src/offline/syncWorker"
import { downloadFreelancersCsv } from "../../src/utils/freelancerCsvDownload"

const BRAND_BLUE = "#2881FA"


const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  approved: { bg: "#d1fae5", text: "#065f46" },
  pending: { bg: "#fef3c7", text: "#92400e" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
  deactivated: { bg: "#f1f5f9", text: "#64748b" },
}

export default function FreelancersScreen() {
  const [freelancers, setFreelancers] = useState<FreelancerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedFreelancer, setSelectedFreelancer] = useState<FreelancerRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await getFreelancersLocalFirst()
      setFreelancers(data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load freelancers.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    return subscribeToOfflineData(load)
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setFreelancers(await syncFreelancersNow())
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to sync freelancers.")
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleDelete = (freelancer: FreelancerRow) => {
    Alert.alert(
      "Delete Freelancer",
      `Are you sure you want to delete ${freelancer.full_name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(freelancer.id)
            try {
              await deleteFreelancer(freelancer.id)
              setFreelancers((prev) => prev.filter((f) => f.id !== freelancer.id))
              Alert.alert("Deleted", `${freelancer.full_name} has been removed.`)
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.error || err?.message || "Failed to delete.")
            } finally {
              setDeletingId(null)
            }
          },
        },
      ]
    )
  }

  const handleCsvDownload = async () => {
    setDownloading(true)
    try {
      await downloadFreelancersCsv(filtered)
    } catch (err: any) {
      Alert.alert("Download Failed", err?.message || "Could not create the freelancers CSV file.")
    } finally {
      setDownloading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return freelancers
    const q = search.toLowerCase()
    return freelancers.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        (f.freelancer_code || "").toLowerCase().includes(q) ||
        (f.display_code || "").toLowerCase().includes(q)
    )
  }, [freelancers, search])

  const active = freelancers.filter((f) => f.registration_status === "approved").length

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return d || ""
    }
  }

  return (
    <View style={s.container}>
      <View style={s.brandBar}>
        <Text style={s.brandText}></Text>
      </View>

      <FlatList
        style={s.scroll}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gradientStart} />
        }
        ListHeaderComponent={(
          <>
            <View style={s.headerRow}>
              <View style={s.headerLeft}>
                <Text style={s.headerTitle}>Freelancers</Text>
                <Text style={s.headerSub}>{freelancers.length} total | {active} active</Text>
              </View>
              <View style={s.headerActions}>
                <TouchableOpacity onPress={handleCsvDownload} style={[s.csvBtn, (downloading || filtered.length === 0) && s.disabledBtn]} disabled={downloading || filtered.length === 0}>
                  {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Download size={16} color="#fff" />}
                  <Text style={s.csvBtnText}>{downloading ? "Preparing" : "CSV"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>Back</Text></TouchableOpacity>
              </View>
            </View>
            <View style={s.searchWrap}>
              <TextInput placeholder="Search by name, email or code..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} style={s.searchInput} />
            </View>
            {loading && <View style={s.centerWrap}><ActivityIndicator size="large" color={COLORS.gradientStart} /></View>}
            {error && <View style={s.errorWrap}><Text style={s.errorText}>{error}</Text><TouchableOpacity onPress={load} style={s.retryBtn}><Text style={s.retryBtnText}>Retry</Text></TouchableOpacity></View>}
          </>
        )}
        ListEmptyComponent={!loading ? <Text style={s.emptyText}>{search ? "No freelancers match your search." : "No freelancers registered yet."}</Text> : null}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item: f }) => {
          const badge = STATUS_BADGE[f.registration_status] || { bg: "#f1f5f9", text: "#475569" }
          const isDeleting = deletingId === f.id
          return (
            <View key={f.id} style={[s.card, SHADOWS.cardSm]}>
              <TouchableOpacity
                onPress={() => setSelectedFreelancer(f)}
                activeOpacity={0.7}
              >
                <View style={s.cardRow1}>
                  <Text style={s.nameText}>{f.full_name}</Text>
                  <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.statusText, { color: badge.text }]}>
                      {f.registration_status}
                    </Text>
                  </View>
                </View>
                <Text style={s.subText}>📧 {f.email}</Text>
                <Text style={s.subText}>📞 {f.mpesa_phone || "N/A"}</Text>
                <View style={s.cardRow1}>
                  <Text style={s.codeText}>
                    {f.display_code || f.freelancer_code}
                  </Text>
                  <Text style={s.dateText}>{formatDate(f.created_at)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.deleteBtn, isDeleting && { opacity: 0.5 }]}
                onPress={() => handleDelete(f)}
                disabled={isDeleting}
              >
                <Text style={s.deleteBtnText}>
                  {isDeleting ? "Deleting..." : " Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }}
      />

      {/* Detail Modal */}
      <Modal visible={!!selectedFreelancer} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalCard}>
            <Text style={s.modalTitle}>Freelancer Details</Text>
            {selectedFreelancer && (
              <>
                <Text style={s.modalSub}>
                  {selectedFreelancer.display_code || selectedFreelancer.freelancer_code}
                </Text>
                <View style={s.detailSection}>
                  <Text style={s.detailLabel}>Full Name</Text>
                  <Text style={s.detailValue}>{selectedFreelancer.full_name}</Text>

                  <Text style={s.detailLabel}>Email</Text>
                  <Text style={s.detailValue}>{selectedFreelancer.email}</Text>

                  <Text style={s.detailLabel}>Phone</Text>
                  <Text style={s.detailValue}>{selectedFreelancer.mpesa_phone || "N/A"}</Text>

                  <Text style={s.detailLabel}>Registration Status</Text>
                  <View style={[s.statusBadge, { alignSelf: "flex-start", marginTop: 4, backgroundColor: (STATUS_BADGE[selectedFreelancer.registration_status] || { bg: "#f1f5f9" }).bg }]}>
                    <Text style={[s.statusText, { color: (STATUS_BADGE[selectedFreelancer.registration_status] || { text: "#475569" }).text }]}>
                      {selectedFreelancer.registration_status}
                    </Text>
                  </View>

                  <Text style={s.detailLabel}>Freelancer Code</Text>
                  <Text style={s.detailValue}>{selectedFreelancer.freelancer_code}</Text>

                  <Text style={s.detailLabel}>Display Code</Text>
                  <Text style={s.detailValue}>{selectedFreelancer.display_code || "N/A"}</Text>

                  <Text style={s.detailLabel}>Created</Text>
                  <Text style={s.detailValue}>{formatDate(selectedFreelancer.created_at)}</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setSelectedFreelancer(null)}
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
  backBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
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
  nameText: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  subText: { fontSize: 12, color: "#64748b", marginTop: 3 },
  codeText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: COLORS.gradientStart,
    fontWeight: "700",
    marginTop: 6,
  },
  dateText: { fontSize: 11, color: "#94a3b8", marginTop: 6 },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.gradientStart, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  deleteBtn: {
    marginTop: 8,
    backgroundColor: "#fef2f2",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteBtnText: { color: "#dc2626", fontSize: 12, fontWeight: "700" },

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