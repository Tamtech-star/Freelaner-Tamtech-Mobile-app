import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { useAuthStore } from "../../src/store/authStore"
import { COLORS, SHADOWS } from "../../src/constants/config"

//  Types 
type LeadItem = {
  id: string
  customer_name: string
  customer_type: string
  phone_number: string
  email: string
  bike_model: string
  status: string
  commission_status: string
  created_at: string
  location: string
  id_number: string
  kra_pin: string
}

type StatCard = {
  label: string
  value: string | number
  color?: string
  detail?: string
  onPress?: () => void
}

type WorkflowStep = {
  key: string
  label: string
  description: string
  icon: string
  completed: boolean
  current: boolean
  onPress: () => void
}

// ── MOCK DATA ──
const MOCK_LEADS: LeadItem[] = [
  {
    id: "1",
    customer_name: "Jane Wanjiku",
    customer_type: "individual",
    phone_number: "0712345678",
    email: "jane@example.com",
    bike_model: "EKON450M1V2",
    status: "active",
    commission_status: "pending",
    created_at: "2025-03-15",
    location: "Nairobi",
    id_number: "12345678",
    kra_pin: "",
  },
  {
    id: "2",
    customer_name: "Peter Kamau",
    customer_type: "individual",
    phone_number: "0723456789",
    email: "",
    bike_model: "VEO",
    status: "converted",
    commission_status: "paid",
    created_at: "2025-03-10",
    location: "Kiambu",
    id_number: "23456789",
    kra_pin: "P051234567Z",
  },
]

// ── Stat Card Component ──
function StatCardView({ label, value, color, onPress, detail }: StatCard) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.statCard, SHADOWS.card]}
      disabled={!onPress}
    >
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : undefined]}>
        {value}
      </Text>
      {detail && <Text style={s.statDetail}>{detail}</Text>}
    </TouchableOpacity>
  )
}

// ── Lead Detail Card Component ──
function LeadDetailCard({
  lead,
  onClose,
}: {
  lead: LeadItem
  onClose: () => void
}) {
  const statusColor =
    lead.status === "active"
      ? "#2563eb"
      : lead.status === "converted"
        ? "#059669"
        : lead.status === "converted_by_agent"
          ? "#d97706"
          : "#6b7280"

  return (
    <View style={s.leadDetailOverlay}>
      <ScrollView
        style={s.leadDetailCard}
        contentContainerStyle={{ padding: 24 }}
      >
        <View style={s.leadDetailHeader}>
          <Text style={s.leadDetailName}>{lead.customer_name}</Text>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        </View>

        <View style={s.leadDetailSection}>
          <Text style={s.leadDetailLabel}>Contact</Text>
          <Text style={s.leadDetailValue}>{lead.phone_number}</Text>
          {lead.email ? (
            <Text style={s.leadDetailValue}>{lead.email}</Text>
          ) : null}
        </View>

        <View style={s.leadDetailSection}>
          <Text style={s.leadDetailLabel}>Details</Text>
          <Text style={s.leadDetailValue}>
            Type: {lead.customer_type === "individual" ? "Individual" : "Company"}
          </Text>
          <Text style={s.leadDetailValue}>Location: {lead.location}</Text>
          <Text style={s.leadDetailValue}>Bike: {lead.bike_model || "—"}</Text>
          {lead.id_number && (
            <Text style={s.leadDetailValue}>ID: {lead.id_number}</Text>
          )}
          {lead.kra_pin && (
            <Text style={s.leadDetailValue}>KRA PIN: {lead.kra_pin}</Text>
          )}
        </View>

        <View style={s.leadDetailSection}>
          <Text style={s.leadDetailLabel}>Status</Text>
          <Text style={[s.leadDetailValue, { color: statusColor, fontWeight: "700" }]}>
            {lead.status.replace(/_/g, " ").toUpperCase()}
          </Text>
          <Text style={s.leadDetailValue}>
            Commission: {lead.commission_status}
          </Text>
          <Text style={s.leadDetailValue}>
            Created: {new Date(lead.created_at).toLocaleDateString()}
          </Text>
        </View>

        <TouchableOpacity onPress={onClose} style={s.leadDetailCloseBtn}>
          <Text style={s.leadDetailCloseText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ── Lead Submission Form Component ──
function LeadSubmissionForm({
  onClose,
  onSuccess,
  user,
}: {
  onClose: () => void
  onSuccess: (message: string) => void
  user: any
}) {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    customerName: "",
    phoneNumber: "",
    customerType: "individual",
    location: "",
    bikeModel: "",
    idNumber: "",
    kraPin: "",
    email: "",
  })

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.phoneNumber.trim()) {
      Alert.alert("Required", "Customer name and phone number are required.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customerName: form.customerName,
        phoneNumber: form.phoneNumber,
        customerType: form.customerType,
        location: form.location,
        bikeModel: form.bikeModel || "Not specified",
        idNumber: form.idNumber,
        kraPin: form.kraPin,
        email: form.email,
        freelancerCode: user?.code || "TEST-CODE",
        freelancerName: user?.name || "Test Freelancer",
      }

      const res = await fetch("https://api.spirospares.com/api/portal/freelancers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Submission failed")
      }

      onSuccess("Lead submitted successfully!")
      onClose()
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit lead.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={s.submitFormOverlay}>
      <ScrollView
        style={s.submitFormCard}
        contentContainerStyle={{ padding: 24 }}
      >
        <Text style={s.submitFormTitle}>New Lead Submission</Text>
        <Text style={s.submitFormSub}>
          Freelancer: {user?.name || "Freelancer"}
        </Text>
        <Text style={s.submitFormSub}>Code: {user?.code || "—"}</Text>

        <View style={s.formFields}>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Customer Name *</Text>
            <TextInput
              style={s.input}
              value={form.customerName}
              onChangeText={(v) => updateField("customerName", v)}
              placeholder="Imbeka Musa"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={s.input}
              value={form.phoneNumber}
              onChangeText={(v) => updateField("phoneNumber", v)}
              placeholder="0712345678"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Customer Type</Text>
            <View style={s.toggleGroup}>
              <TouchableOpacity
                onPress={() => updateField("customerType", "individual")}
                style={[s.toggleBtn, form.customerType === "individual" && s.toggleActive]}
              >
                <Text
                  style={[s.toggleText, form.customerType === "individual" && s.toggleTextActive]}
                >
                  Individual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateField("customerType", "company")}
                style={[s.toggleBtn, form.customerType === "company" && s.toggleActive]}
              >
                <Text
                  style={[s.toggleText, form.customerType === "company" && s.toggleTextActive]}
                >
                  Company
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Location</Text>
            <TextInput
              style={s.input}
              value={form.location}
              onChangeText={(v) => updateField("location", v)}
              placeholder="Nairobi"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Bike Model</Text>
            <TextInput
              style={s.input}
              value={form.bikeModel}
              onChangeText={(v) => updateField("bikeModel", v)}
              placeholder="e.g. EKON450M1V2"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>ID Number</Text>
            <TextInput
              style={s.input}
              value={form.idNumber}
              onChangeText={(v) => updateField("idNumber", v)}
              placeholder="12345678"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>KRA PIN</Text>
            <TextInput
              style={s.input}
              value={form.kraPin}
              onChangeText={(v) => updateField("kraPin", v)}
              placeholder="P051234567Z"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              placeholder="customer@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={s.submitActions}>
          <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[s.saveBtn, submitting && { opacity: 0.5 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Submit Lead</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

// ── Main Component ──
export default function FreelancerDashboard() {
  const { user, logout } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [leads, setLeads] = useState<LeadItem[]>(MOCK_LEADS)
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null)
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"active" | "all">("active")

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    // TODO: fetch from API
    setTimeout(() => setRefreshing(false), 1000)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const filteredLeads = useMemo(() => {
    if (activeTab === "active") {
      return leads.filter((l) => l.status === "active")
    }
    return leads
  }, [leads, activeTab])

  const totalLeads = leads.length
  const activeLeads = leads.filter((l) => l.status === "active").length
  const totalPaid = leads
    .filter((l) => l.commission_status === "paid")
    .length

  const metrics = {
    totalLeads,
    activeLeads,
    totalPaid,
  }

  const handleViewLead = useCallback((lead: LeadItem) => {
    setSelectedLead(lead)
  }, [])

  // ── Workflow steps ──
  const workflowSteps: WorkflowStep[] = [
    {
      key: "lead-creation",
      label: "Lead Creation",
      description: "Submit new customer lead",
      icon: "➕",
      completed: false,
      current: true,
      onPress: () => setShowNewLeadForm(true),
    },
    {
      key: "sale-conversion",
      label: "Sale Conversion",
      description: "Convert lead when customer buys",
      icon: "🔄",
      completed: false,
      current: false,
      onPress: () => handleViewLead(leads[0]), // placeholder
    },
    {
      key: "commission-claim",
      label: "Commission Claim",
      description: "Download invoice & auto-claim",
      icon: "📄",
      completed: false,
      current: false,
      onPress: () => Alert.alert("Coming soon", "Commission claim workflow"),
    },
    {
      key: "payment-acknowledge",
      label: "Payment Acknowledge",
      description: "Acknowledge received payment",
      icon: "✅",
      completed: false,
      current: false,
      onPress: () => Alert.alert("Coming soon", "Payment acknowledge workflow"),
    },
  ]

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gradientStart}
          />
        }
      >
        {/* Profile Header */}
        <View style={s.profileHeader}>
          <View style={s.profileInfo}>
            <Text style={s.userName}>{user?.name || "Freelancer"}</Text>
            <View style={s.codeBadge}>
              <Text style={s.codeBadgeText}>
                {user?.code || "MUSA.SIMON4289"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Success Banner */}
        {successMsg && (
          <View style={s.successBanner}>
            <Text style={s.successBannerText}>{successMsg}</Text>
            <TouchableOpacity onPress={() => setSuccessMsg(null)}>
              <Text style={s.successBannerDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Row */}
        <View style={s.navRow}>
          <TouchableOpacity
            onPress={() => setActiveTab("active")}
            style={[s.navBtn, activeTab === "active" && s.navBtnActive]}
          >
            <Text
              style={[
                s.navBtnText,
                activeTab === "active" && s.navBtnTextActive,
              ]}
            >
              Freelancer Dashboard
            </Text>
          </TouchableOpacity>

          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.gradientBtn}
          >
            <TouchableOpacity
              onPress={() => setShowNewLeadForm(true)}
              activeOpacity={0.8}
            >
              <Text style={s.gradientBtnText}>+ New Lead</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Referral Code */}
        <View style={s.refCodeBox}>
          <Text style={s.refCodeLabel}>Your Referral Code</Text>
          <Text style={s.refCodeValue}>
            {user?.code || "MUSA.SIMON4289"}
          </Text>
        </View>

        {/* Stat Cards */}
        <Text style={s.sectionTitle}>Your Performance</Text>
        <View style={s.statsGrid}>
          <StatCardView
            label="Total Leads"
            value={metrics.totalLeads}
            onPress={() => setActiveTab("all")}
            detail={`${metrics.activeLeads} active`}
          />
          <StatCardView
            label="Active Leads"
            value={metrics.activeLeads}
            color={COLORS.warning}
            onPress={() => setActiveTab("active")}
          />
          <StatCardView
            label="Total Paid"
            value={`KES ${metrics.totalPaid.toLocaleString()}`}
            color={COLORS.success}
          />
        </View>

        {/* Workflow Stepper */}
        <Text style={s.sectionTitle}>Workflow</Text>
        <View style={s.workflowList}>
          {workflowSteps.map((step, index) => (
            <TouchableOpacity
              key={step.key}
              onPress={step.onPress}
              style={[s.workflowCard, step.completed && s.workflowCardComplete]}
            >
              <View style={s.workflowRow}>
                <View style={s.workflowStepNum}>
                  <Text style={s.workflowStepNumText}>{index + 1}</Text>
                </View>
                <View style={s.workflowContent}>
                  <Text style={s.workflowLabel}>{step.label}</Text>
                  <Text style={s.workflowDesc}>{step.description}</Text>
                </View>
                <Text style={s.workflowArrow}>→</Text>
              </View>
              {index < workflowSteps.length - 1 && (
                <View
                  style={[
                    s.workflowConnector,
                    step.completed && s.workflowConnectorComplete,
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Leads */}
        <View style={s.recentHeader}>
          <Text style={s.sectionTitle}>Recent Leads</Text>
          <View style={s.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveTab("active")}
              style={[s.tab, activeTab === "active" && s.tabActive]}
            >
              <Text
                style={[s.tabText, activeTab === "active" && s.tabTextActive]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("all")}
              style={[s.tab, activeTab === "all" && s.tabActive]}
            >
              <Text
                style={[s.tabText, activeTab === "all" && s.tabTextActive]}
              >
                All Leads
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredLeads.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No leads submitted yet.</Text>
            <Text style={s.emptySubtext}>
              Tap "+ New Lead" to get started
            </Text>
          </View>
        ) : (
          <View style={s.leadList}>
            {filteredLeads.map((lead) => {
              const statusColor =
                lead.status === "active"
                  ? COLORS.info
                  : lead.status === "converted"
                    ? COLORS.success
                    : "#d97706"
              return (
                <TouchableOpacity
                  key={lead.id}
                  onPress={() => handleViewLead(lead)}
                  style={[s.leadCard, SHADOWS.cardSm]}
                >
                  <View style={s.leadCardHeader}>
                    <Text style={s.leadCardName}>
                      {lead.customer_name}
                    </Text>
                    <View
                      style={[
                        s.leadStatusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                  </View>
                  <Text style={s.leadCardPhone}>{lead.phone_number}</Text>
                  <View style={s.leadCardFooter}>
                    <Text style={s.leadCardStatus}>
                      {lead.status.replace(/_/g, " ")}
                    </Text>
                    <Text style={s.leadCardDate}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailCard
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* New Lead Form Modal */}
      {showNewLeadForm && (
        <LeadSubmissionForm
          user={user}
          onClose={() => setShowNewLeadForm(false)}
          onSuccess={(msg) => {
            setSuccessMsg(msg)
          }}
        />
      )}
    </View>
  )
}

// ── Styles ──
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },

  // Profile Header
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  profileInfo: { flex: 1 },
  userName: { fontSize: 26, fontWeight: "700", color: COLORS.heading },
  codeBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  codeBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: COLORS.error, fontWeight: "600", fontSize: 13 },

  // Success Banner
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.successBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.success,
  },
  successBannerDismiss: { fontSize: 16, color: COLORS.success, marginLeft: 8 },

  // Navigation
  navRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  navBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  navBtnActive: { backgroundColor: COLORS.info, borderColor: COLORS.info },
  navBtnText: { fontWeight: "600", fontSize: 13, color: COLORS.muted },
  navBtnTextActive: { color: "#fff" },
  gradientBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  gradientBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },

  // Referral Code
  refCodeBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    ...SHADOWS.cardSm,
  },
  refCodeLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  refCodeValue: {
    fontSize: 14,
    color: COLORS.heading,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 12,
    marginTop: 4,
  },

  // Stats
  statsGrid: { gap: 12, marginBottom: 24 },
  statCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 20,
    minHeight: 100,
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.heading,
    marginTop: 4,
  },
  statDetail: { fontSize: 12, color: COLORS.light, marginTop: 4 },

  // Workflow
  workflowList: { gap: 4, marginBottom: 24 },
  workflowCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    ...SHADOWS.cardSm,
  },
  workflowCardComplete: { borderColor: COLORS.success, backgroundColor: COLORS.successBg },
  workflowRow: { flexDirection: "row", alignItems: "center" },
  workflowStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.infoBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  workflowStepNumText: { color: COLORS.info, fontWeight: "700", fontSize: 13 },
  workflowContent: { flex: 1 },
  workflowLabel: { fontSize: 14, fontWeight: "700", color: COLORS.heading },
  workflowDesc: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  workflowArrow: { fontSize: 16, color: COLORS.light },
  workflowConnector: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.cardBorder,
    marginLeft: 14,
    marginTop: 4,
  },
  workflowConnectorComplete: { backgroundColor: COLORS.success },

  // Recent Leads Header
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tabActive: { backgroundColor: COLORS.info, borderColor: COLORS.info },
  tabText: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  tabTextActive: { color: "#fff" },

  // Lead List
  leadList: { gap: 8 },
  leadCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 16,
  },
  leadCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leadCardName: { fontSize: 15, fontWeight: "600", color: COLORS.heading },
  leadStatusDot: { width: 10, height: 10, borderRadius: 5 },
  leadCardPhone: { fontSize: 13, color: COLORS.body, marginTop: 4 },
  leadCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  leadCardStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.info,
    textTransform: "capitalize",
  },
  leadCardDate: { fontSize: 11, color: COLORS.light },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: { fontSize: 15, fontWeight: "600", color: COLORS.muted, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: COLORS.light },

  // ── Lead Detail Modal ──
  leadDetailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  leadDetailCard: {
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  leadDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  leadDetailName: { fontSize: 22, fontWeight: "700", color: COLORS.heading },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  leadDetailSection: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  leadDetailLabel: { fontSize: 11, fontWeight: "700", color: COLORS.muted, marginBottom: 4 },
  leadDetailValue: { fontSize: 14, color: COLORS.body, marginBottom: 2 },
  leadDetailCloseBtn: {
    marginTop: 8,
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  leadDetailCloseText: { fontSize: 14, fontWeight: "700", color: COLORS.body },

  // ── Lead Submission Form ──
  submitFormOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  submitFormCard: {
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  submitFormTitle: { fontSize: 22, fontWeight: "700", color: COLORS.heading, marginBottom: 4 },
  submitFormSub: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },

  // ── Shared Form Styles ──
  formFields: { gap: 14, marginVertical: 16 },
  fieldGroup: {},
  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.heading,
    backgroundColor: "#fff",
  },
  toggleGroup: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },
  toggleActive: { backgroundColor: COLORS.info, borderColor: COLORS.info },
  toggleText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  toggleTextActive: { color: "#fff" },
  submitActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  saveBtn: {
    backgroundColor: COLORS.gradientStart,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
})
