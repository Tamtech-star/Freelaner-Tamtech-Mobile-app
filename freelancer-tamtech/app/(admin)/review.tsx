import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { router } from "expo-router"
import {
  getReviewDuplicates,
  getReviewConversions,
  getPendingPayments,
  approveRejectDuplicate,
  approveRejectConversion,
  approvePayment,
  rejectPayment,
  type DuplicateLeadItem,
  type ConversionReviewItem,
  type PendingPaymentItem,
} from "../../src/api/admin"
import { COLORS, SHADOWS } from "../../src/constants/config"

const BRAND_BLUE = "#2881FA"
const BRAND_TEAL = "#45E0D7"

type Tab = "payments" | "duplicates" | "conversions"

export default function ReviewQueueScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("payments")
  const [duplicates, setDuplicates] = useState<DuplicateLeadItem[]>([])
  const [conversions, setConversions] = useState<ConversionReviewItem[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Payment modal
  const [activePayment, setActivePayment] = useState<PendingPaymentItem | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    paymentMode: "M-Pesa",
    transactionReference: "",
    amountPaid: "",
    adminRemarks: "",
  })

  // Conversion detail modal
  const [activeConversion, setActiveConversion] = useState<ConversionReviewItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dup, conv, pay] = await Promise.all([
        getReviewDuplicates().catch(() => []),
        getReviewConversions().catch(() => []),
        getPendingPayments().catch(() => []),
      ])
      setDuplicates(dup)
      setConversions(conv)
      setPendingPayments(pay)
    } catch {
      setError("Failed to load review queues.")
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

  const totalPending = duplicates.length + conversions.length + pendingPayments.length

  const handleDuplicate = async (leadCode: string, decision: "approve" | "reject") => {
    const label = decision === "approve" ? "APPROVE" : "REJECT"
    Alert.alert(
      `${label} Duplicate`,
      `Are you sure you want to ${decision} this duplicate lead?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          onPress: async () => {
            setBusyId(`dup-${leadCode}`)
            try {
              await approveRejectDuplicate(leadCode, decision)
              await load()
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed.")
            } finally {
              setBusyId(null)
            }
          },
        },
      ]
    )
  }

  const handleConversion = async (conversionCode: string, decision: "approve" | "reject") => {
    const label = decision === "approve" ? "APPROVE" : "REJECT"
    Alert.alert(
      `${label} Conversion`,
      `Are you sure you want to ${decision} this conversion?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          onPress: async () => {
            setBusyId(`conv-${conversionCode}`)
            try {
              await approveRejectConversion(conversionCode, decision)
              setActiveConversion(null)
              await load()
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed.")
            } finally {
              setBusyId(null)
            }
          },
        },
      ]
    )
  }

  const handlePaymentApprove = async () => {
    if (!activePayment) return
    setBusyId(`pay-${activePayment.id}`)
    try {
      await approvePayment(activePayment.id, {
        ...paymentForm,
        transactionReference: paymentForm.transactionReference || "MOBILE-PAYMENT",
      })
      setActivePayment(null)
      await load()
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed.")
    } finally {
      setBusyId(null)
    }
  }

  const handlePaymentReject = async () => {
    if (!activePayment) return
    Alert.alert(
      "Reject Payment",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setBusyId(`pay-${activePayment.id}`)
            try {
              await rejectPayment(activePayment.id)
              setActivePayment(null)
              await load()
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed.")
            } finally {
              setBusyId(null)
            }
          },
        },
      ]
    )
  }

  const TabBtn = ({ tab, label, count }: { tab: Tab; label: string; count: number }) => (
    <TouchableOpacity
      style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{label}</Text>
      {count > 0 && (
        <View style={[s.badge, activeTab === tab && s.badgeActive]}>
          <Text style={[s.badgeText, activeTab === tab && s.badgeTextActive]}>{count}</Text>
        </View>
      )}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_BLUE} />
        }
      >
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Review Queue</Text>
            <Text style={s.headerSub}>{totalPending} pending decisions</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={s.tabRow}>
          <TabBtn tab="payments" label="Payments" count={pendingPayments.length} />
          <TabBtn tab="duplicates" label="Duplicates" count={duplicates.length} />
          <TabBtn tab="conversions" label="Conversions" count={conversions.length} />
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

        {/* Payments Tab */}
        {activeTab === "payments" && !loading && (
          <>
            {pendingPayments.length === 0 ? (
              <Text style={s.emptyText}>No pending commission claims.</Text>
            ) : (
              pendingPayments.map((item) => (
                <View key={item.id} style={[s.card]}>
                  <Text style={s.codeText}>{item.invoice_code}</Text>
                  <Text style={s.nameText}>
                    {item.freelancer_name} | {item.freelancer_phone}
                  </Text>
                  <Text style={s.subText}>Customer: {item.customer_name}</Text>
                  <Text style={s.subText}>
                    Bike: {item.bike_model} | Qty: {item.quantity}
                  </Text>
                  <Text style={s.amountText}>
                    KES {item.commission_amount_kes?.toLocaleString()}
                  </Text>
                  <View style={s.cardActions}>
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => {
                        setActivePayment(item)
                        setPaymentForm({
                          paymentMode: "M-Pesa",
                          transactionReference: "",
                          amountPaid: String(item.commission_amount_kes || 0),
                          adminRemarks: "",
                        })
                      }}
                    >
                      <Text style={s.approveBtnText}>Process Payment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => {
                        Alert.alert("Reject", "Reject this payment?", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Reject",
                            style: "destructive",
                            onPress: async () => {
                              setBusyId(`pay-${item.id}`)
                              try {
                                await rejectPayment(item.id)
                                await load()
                              } catch (err: any) {
                                Alert.alert("Error", err?.message || "Failed.")
                              } finally {
                                setBusyId(null)
                              }
                            },
                          },
                        ])
                      }}
                    >
                      <Text style={s.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Duplicates Tab */}
        {activeTab === "duplicates" && !loading && (
          <>
            {duplicates.length === 0 ? (
              <Text style={s.emptyText}>No pending duplicate reviews.</Text>
            ) : (
              duplicates.map((item) => (
                <View key={item.id} style={[s.card]}>
                  <Text style={s.codeText}>{item.lead?.lead_code}</Text>
                  <Text style={s.nameText}>
                    {item.lead?.customer_full_name} - {item.lead?.customer_phone}
                  </Text>
                  <Text style={s.subText}>
                    Bike: {item.lead?.bike_model} | County: {item.lead?.county}
                  </Text>
                  <Text style={s.subText}>
                    Reason: {item.lead?.duplicate_override_reason || "N/A"}
                  </Text>
                  <Text style={s.subText}>
                    Metric score: {item.metricScore ?? "N/A"}
                  </Text>
                  <View style={s.cardActions}>
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() =>
                        handleDuplicate(item.lead?.lead_code || "", "approve")
                      }
                      disabled={busyId !== null || !item.lead?.lead_code}
                    >
                      <Text style={s.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() =>
                        handleDuplicate(item.lead?.lead_code || "", "reject")
                      }
                      disabled={busyId !== null || !item.lead?.lead_code}
                    >
                      <Text style={s.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Conversions Tab */}
        {activeTab === "conversions" && !loading && (
          <>
            {conversions.length === 0 ? (
              <Text style={s.emptyText}>No pending conversion reviews.</Text>
            ) : (
              conversions.map((item) => (
                <View key={item.id} style={[s.card]}>
                  <Text style={s.codeText}>{item.conversionCode}</Text>
                  <Text style={s.nameText}>
                    Customer: {item.lead?.customer_full_name}
                  </Text>
                  <View style={s.cardActions}>
                    <TouchableOpacity
                      style={s.viewBtn}
                      onPress={() => setActiveConversion(item)}
                    >
                      <Text style={s.viewBtnText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Payment Processing Modal */}
      <Modal visible={!!activePayment} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalCard}>
            <Text style={s.modalTitle}>Process Payment</Text>
            <Text style={s.modalSub}>{activePayment?.invoice_code}</Text>

            <Text style={s.fieldLabel}>Payment Mode</Text>
            <View style={s.pickerWrap}>
              <Picker
                selectedValue={paymentForm.paymentMode}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, paymentMode: v })
                }
                style={s.picker}
              >
                <Picker.Item label="M-Pesa" value="M-Pesa" />
                <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                <Picker.Item label="Cash" value="Cash" />
              </Picker>
            </View>

            {/* ── TRANSACTION REFERENCE — commented out in mobile ──
            <Text style={s.fieldLabel}>Transaction Reference *</Text>
            <TextInput
              style={s.input}
              value={paymentForm.transactionReference}
              onChangeText={(v) => setPaymentForm({ ...paymentForm, transactionReference: v })}
              placeholder="e.g. MPESA-TX123"
              placeholderTextColor="#94a3b8"
            />
            */}

            <Text style={s.fieldLabel}>Amount Paid (KES)</Text>
            <TextInput
              style={s.input}
              value={paymentForm.amountPaid}
              onChangeText={(v) =>
                setPaymentForm({ ...paymentForm, amountPaid: v })
              }
              keyboardType="number-pad"
            />

            <Text style={s.fieldLabel}>Admin Remarks</Text>
            <TextInput
              style={s.input}
              value={paymentForm.adminRemarks}
              onChangeText={(v) =>
                setPaymentForm({ ...paymentForm, adminRemarks: v })
              }
              placeholder="Optional"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              style={s.approveBtn}
              onPress={handlePaymentApprove}
              disabled={busyId !== null}
            >
              <Text style={s.approveBtnText}>
                {busyId ? "Processing..." : "Confirm Payment"}
              </Text>
            </TouchableOpacity>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.rejectBtn}
                onPress={handlePaymentReject}
                disabled={busyId !== null}
              >
                <Text style={s.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setActivePayment(null)}
                disabled={busyId !== null}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Conversion Detail Modal */}
      <Modal visible={!!activeConversion} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={[s.modalCard, { maxHeight: "85%" }]}>
            <Text style={s.modalTitle}>Review Conversion</Text>
            <Text style={s.modalSub}>{activeConversion?.conversionCode}</Text>

            {activeConversion && (
              <>
                <View style={s.detailSection}>
                  <Text style={s.subText}>
                    Customer: {activeConversion.lead?.customer_full_name}
                  </Text>
                  <Text style={s.subText}>
                    Phone: {activeConversion.lead?.customer_phone}
                  </Text>
                  <Text style={s.subText}>
                    Invoice #: {activeConversion.invoiceNumber}
                  </Text>
                  <Text style={s.subText}>
                    Bike Sold: {activeConversion.bikeModelSold}
                  </Text>
                  <Text style={s.subText}>
                    Quantity: {activeConversion.quantityPurchased}
                  </Text>
                  <Text style={s.subText}>
                    Remarks: {activeConversion.validationRemarks || "None"}
                  </Text>
                </View>

                {activeConversion.invoice_photo_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() =>
                      Linking.openURL(activeConversion.invoice_photo_url!)
                    }
                  >
                    <Text style={s.docLinkText}>
                      📎 View Invoice Photo
                    </Text>
                  </TouchableOpacity>
                )}
                {activeConversion.sales_agreement_url && (
                  <TouchableOpacity
                    style={s.docLink}
                    onPress={() =>
                      Linking.openURL(activeConversion.sales_agreement_url!)
                    }
                  >
                    <Text style={s.docLinkText}>
                      📎 View Sales Agreement
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={s.approveBtn}
                    onPress={() =>
                      handleConversion(activeConversion.conversionCode, "approve")
                    }
                    disabled={busyId !== null}
                  >
                    <Text style={s.approveBtnText}>Approve Sale</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() =>
                      handleConversion(activeConversion.conversionCode, "reject")
                    }
                    disabled={busyId !== null}
                  >
                    <Text style={s.rejectBtnText}>Reject Sale</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setActiveConversion(null)}
              disabled={busyId !== null}
            >
              <Text style={s.cancelBtnText}>Close</Text>
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
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  backText: { fontSize: 13, fontWeight: "500", color: "#64748b" },

  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  tabBtnActive: {
    borderColor: BRAND_BLUE,
    backgroundColor: "#eff6ff",
  },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: BRAND_BLUE },
  badge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeActive: { backgroundColor: BRAND_BLUE },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  badgeTextActive: { color: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.cardSm,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  nameText: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginTop: 2 },
  subText: { fontSize: 12, color: "#64748b", marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: "700", color: "#10b981", marginTop: 6 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  approveBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  approveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#fef2f2",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  rejectBtnText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },
  viewBtn: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: "#334155", fontSize: 13, fontWeight: "600" },

  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 32, fontSize: 14 },
  centerWrap: { marginTop: 32, alignItems: "center" },
  errorWrap: { marginTop: 16, alignItems: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
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
    maxHeight: "90%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  modalSub: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
    fontFamily: "monospace",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  picker: { height: 46 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  detailSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  docLink: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    marginBottom: 6,
  },
  docLinkText: { fontSize: 13, fontWeight: "600", color: BRAND_BLUE },
})