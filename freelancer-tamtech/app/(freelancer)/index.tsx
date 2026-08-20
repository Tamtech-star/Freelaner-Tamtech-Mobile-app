import { useState, useCallback, useEffect } from "react";
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
} from "react-native";
import { router } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { ClipboardList, Wallet, FileText, CheckCircle, Clock, CreditCard, XCircle, Check } from "lucide-react-native";
import { useAuthStore } from "../../src/store/authStore";
import { COLORS, SHADOWS } from "../../src/constants/config";
import {
  getFreelancerDashboard,
  getFreelancerDetails,
  submitLead,
  acknowledgePayment,
  downloadReceipt,
} from "../../src/api/portal";

//types
type LeadCardItem = {
  id: string;
  lead_code: string;
  customer_full_name: string;
  customer_id_number: string;
  customer_phone?: string;
  location: string;
  county: string;
  payment_type: string;
  quantity_interested: number;
  quantity_purchased?: number | null;
  lead_notes: string | null;
  lead_status: string;
  invoice_status?: string | null;
  duplicate_override_status: string;
  duplicate_override_reason: string | null;
  created_at: string;
};

type DashboardPayload = {
  freelancer: { full_name: string; freelancer_code: string; display_code: string | null };
  metrics: {
    total_leads_submitted: number;
    pending_processing: number;
    paid_commissions: number;
    total_paid_kes: number;
  };
  payments: Array<{
    payment_code: string;
    payment_date: string;
    amount_paid_kes: number;
    transaction_reference: string;
  }>;
};

type DetailData = { leads: LeadCardItem[] };
type DashboardTab = "cards" | "workflow";

// Constants

const BIKE_MODELS = ["EKON450M1V3", "EKON450M2V2"];

// Reduced to 2 steps
const WORKFLOW_STEPS = [
  { stage: 1, label: "Lead Creation", icon: ClipboardList },
  { stage: 2, label: "Payment Acknowledged", icon: CheckCircle },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  lead_created: { bg: "#dbeafe", text: "#1e40af" },
  converted_to_sale: { bg: "#d1fae5", text: "#065f46" },
  under_review: { bg: "#fed7aa", text: "#9a3412" },
  payment_processing: { bg: "#cffafe", text: "#155e75" },
  commission_paid: { bg: "#d1fae5", text: "#065f46" },
  paid: { bg: "#d1fae5", text: "#065f46" },
  pending: { bg: "#fef3c7", text: "#92400e" },
  submitted: { bg: "#dbeafe", text: "#1e40af" },
  cash: { bg: "#d1fae5", text: "#065f46" },
  loan: { bg: "#dbeafe", text: "#1e40af" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
  approved: { bg: "#d1fae5", text: "#065f46" },
  auto_approved: { bg: "#d1fae5", text: "#065f46" },
  completed: { bg: "#f1f5f9", text: "#475569" },
  closed: { bg: "#f1f5f9", text: "#475569" },
  acknowledged: { bg: "#f1f5f9", text: "#475569" },
  pending_admin: { bg: "#cffafe", text: "#155e75" },
};

// HELPERS

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg: "#f1f5f9", text: "#475569" };
  return (
    <View style={[badgeS.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeS.text, { color: c.text }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}
const badgeS = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
});

function formatCurrency(v: number) { return `KES ${(v || 0).toLocaleString()}`; }
function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

// METRIC CARD

function MetricCard({ label, value, color, onPress }: { label: string; value: string | number; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[mStyles.card, SHADOWS.cardSm]}>
      <Text style={mStyles.label}>{label}</Text>
      <Text style={[mStyles.value, { color }]}>{value}</Text>
      {onPress && <Text style={mStyles.hint}>View details →</Text>}
    </TouchableOpacity>
  );
}
const mStyles = StyleSheet.create({
  card: { width: "47%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 16 },
  label: { fontSize: 10, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  hint: { position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#cbd5e1" },
});

// LEAD DETAIL CARD

function DetailRow({ label, value, isStatus }: { label: string; value: string; isStatus?: boolean }) {
  return (
    <View style={drS.row}>
      <Text style={drS.label}>{label}</Text>
      <View style={{ marginTop: 2 }}>
        {isStatus ? <StatusBadge status={value} /> : <Text style={drS.val}>{value}</Text>}
      </View>
    </View>
  );
}
const drS = StyleSheet.create({
  row: { borderWidth: 1, borderColor: "#f1f5f9", borderRadius: 8, backgroundColor: "#f8fafc", padding: 12 },
  label: { fontSize: 10, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase" },
  val: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginTop: 2 },
});

function LeadDetailCard({ lead, onBack, onProceedToPaymentAck }: { lead: LeadCardItem; onBack: () => void; onProceedToPaymentAck: (lead: LeadCardItem) => void }) {
  const effectiveStatus = lead.invoice_status || lead.lead_status;
  return (
    <View style={[ldS.card, SHADOWS.cardSm]}>
      <TouchableOpacity onPress={onBack} style={ldS.back}>
        <Text style={ldS.backText}>← Back to Leads List</Text>
      </TouchableOpacity>
      <View style={ldS.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={ldS.name}>{lead.customer_full_name}</Text>
            <StatusBadge status={effectiveStatus} />
          </View>
          <Text style={ldS.code}>{lead.lead_code} · Created {lead.created_at ? formatDate(lead.created_at) : "—"}</Text>
        </View>
      </View>
      <View style={ldS.grid}>
        <DetailRow label="Customer Full Name" value={lead.customer_full_name} />
        <DetailRow label="Customer ID Number" value={lead.customer_id_number || "—"} />
        <DetailRow label="Payment Type" value={lead.payment_type} isStatus />
        <DetailRow label="Quantity" value={String(lead.quantity_purchased ?? lead.quantity_interested)} />
        <DetailRow label="Residence Location" value={lead.location || "—"} />
        <DetailRow label="County" value={lead.county || "—"} />
      </View>
      {lead.lead_notes ? (
        <View style={ldS.notes}>
          <Text style={ldS.notesLabel}>Lead Notes / Remarks</Text>
          <Text style={ldS.notesValue}>{lead.lead_notes}</Text>
        </View>
      ) : null}
      {lead.duplicate_override_reason ? (
        <View style={[ldS.notes, { borderColor: "#fcd34d", backgroundColor: "#fffbeb" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[ldS.notesLabel, { color: "#d97706" }]}>Duplicate Override Reason</Text>
            <StatusBadge status={lead.duplicate_override_status} />
          </View>
          <Text style={[ldS.notesValue, { color: "#92400e" }]}>{lead.duplicate_override_reason}</Text>
        </View>
      ) : null}
      <View style={ldS.actions}>
        {(effectiveStatus === "lead_created" || effectiveStatus === "submitted") && (
          <StatusBox icon={Clock} title="Lead Submitted" text="Your lead has been submitted and is awaiting processing." color="cyan" />
        )}
        {effectiveStatus === "under_review" && <StatusBox icon={Clock} title="Pending Approval" text="Lead is waiting for admin approval." color="amber" />}
        {effectiveStatus === "converted_to_sale" && <StatusBox icon={Wallet} title="Sale Confirmed" text="Lead converted to sale. Awaiting commission processing." color="cyan" />}
        {(effectiveStatus === "payment_processing" || effectiveStatus === "pending_admin") && <StatusBox icon={CreditCard} title="Payment Processing" text="Commission is being processed. Awaiting payment from admin." color="cyan" />}
        
        {effectiveStatus === "paid" && (
          <>
            <TouchableOpacity onPress={() => onProceedToPaymentAck(lead)} style={s.submitBtn}>
              <Text style={s.submitBtnText}>✓ Proceed to Payment Acknowledgment →</Text>
            </TouchableOpacity>
            <Text style={ldS.hint}>Confirm you have received the commission payment</Text>
          </>
        )}
        
        {effectiveStatus === "rejected" && <StatusBox icon={XCircle} title="Sale Rejected" text="This lead was not approved. Please contact admin." color="red" />}
        {(effectiveStatus === "closed" || effectiveStatus === "acknowledged") && <StatusBox icon={CheckCircle} title="Lead Closed" text="This lead has been fully completed and closed." color="slate" />}
      </View>
    </View>
  );
}

function StatusBox({ icon: Icon, title, text, color }: { icon: any; title: string; text: string; color: string }) {
  const colors: Record<string, { border: string; bg: string; heading: string; body: string }> = {
    amber: { border: "#fcd34d", bg: "#fffbeb", heading: "#92400e", body: "#92400e" },
    cyan: { border: "#67e8f9", bg: "#ecfeff", heading: "#0e7490", body: "#0e7490" },
    red: { border: "#fca5a5", bg: "#fef2f2", heading: "#991b1b", body: "#991b1b" },
    slate: { border: "#e2e8f0", bg: "#f8fafc", heading: "#475569", body: "#475569" },
  };
  const c = colors[color];
  return (
    <View style={[sbS.box, { borderColor: c.border, backgroundColor: c.bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
         <Icon size={18} color={c.heading} />
         <Text style={[sbS.title, { color: c.heading }]}>{title}</Text>
      </View>
      <Text style={[sbS.text, { color: c.body }]}>{text}</Text>
    </View>
  );
}
const sbS = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center" },
  title: { fontSize: 14, fontWeight: "700" },
  text: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
const ldS = StyleSheet.create({
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 20 },
  back: { marginBottom: 12 },
  backText: { fontSize: 12, fontWeight: "500", color: "#64748b" },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  name: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  code: { fontSize: 11, color: "#64748b", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginTop: 2 },
  grid: { gap: 10, marginBottom: 12 },
  notes: { borderWidth: 1, borderColor: "#f1f5f9", borderRadius: 8, backgroundColor: "#f8fafc", padding: 12, marginBottom: 12 },
  notesLabel: { fontSize: 10, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase" },
  notesValue: { fontSize: 13, color: "#334155", marginTop: 4 },
  actions: { marginTop: 16, gap: 8 },
  hint: { fontSize: 10, color: "#94a3b8", textAlign: "center" },
});

// MAIN COMPONENT

export default function FreelancerDashboard() {
  const { user, logout } = useAuthStore()
  const sessionCode = user?.code || ""
  const [codeInput, setCodeInput] = useState(user?.code || "")
  const [activeCode, setActiveCode] = useState(user?.code || "")
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashError, setDashError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("cards");
  const [leadView, setLeadView] = useState<"VIEW_SUMMARY" | "VIEW_LEAD_LIST" | "VIEW_LEAD_DETAIL">("VIEW_SUMMARY");
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadCardItem | null>(null);
  const [conversionLead, setConversionLead] = useState<LeadCardItem | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [workflowStage, setWorkflowStage] = useState(1);
  const [wfSubmitting, setWfSubmitting] = useState(false);
  const [wfMessage, setWfMessage] = useState<string | null>(null);
  const [wfError, setWfError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dropdown UI States
  const [leadBikeOpen, setLeadBikeOpen] = useState(false);
  const [leadPaymentOpen, setLeadPaymentOpen] = useState(false);

  const [bikeItems, setBikeItems] = useState(
    BIKE_MODELS.map((model) => ({ label: model, value: model }))
  );
  const [paymentItems, setPaymentItems] = useState([
    { label: "Cash", value: "cash" },
    { label: "Loan", value: "loan" },
  ]);

  // Lead form
  const [leadForm, setLeadForm] = useState({ customerFullName: "", customerIdNumber: "", customerPhone: "", bikeModel: "", paymentType: "", quantityInterested: "1", residenceLocation: "", county: "", leadNotes: "", duplicateOverrideReason: "" });
  
  // Payment
  const [paymentCode, setPaymentCode] = useState("");
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentSubCode, setPaymentSubCode] = useState<string | null>(null);

  const loadDashboard = useCallback(async (code: string, silent = false) => {
    const requestedCode = code.trim().toUpperCase();
    if (!requestedCode) return;
    if (!silent) { setDashLoading(true); setDashError(null); setDashboard(null); }
    try {
      const payload = await getFreelancerDashboard(requestedCode);
      setDashboard(payload);
      setActiveCode(requestedCode);
      setCodeInput(requestedCode);
      if (!silent) setActiveTab("cards");
    } catch (err: any) {
      setDashError(err?.response?.data?.error || err?.message || "Failed to load dashboard.");
    } finally { if (!silent) setDashLoading(false); }
  }, []);

  const loadDetailData = useCallback(async (code: string, filter: string | null = null) => {
    setDetailLoading(true);
    setDashError(null);
    setDetailData(null);
    try {
      const payload = await getFreelancerDetails(code, filter);
      setDetailData(payload);
      setLeadView("VIEW_LEAD_LIST");
    } catch (err: any) {
      setDashError(err?.response?.data?.error || err?.message || "Failed to load dashboard details.");
    }
    finally { setDetailLoading(false); }
  }, []);

  const handleLeadRowClick = (lead: LeadCardItem) => { setSelectedLead(lead); setLeadView("VIEW_LEAD_DETAIL"); };
  const handleBackToLeadsList = () => { setSelectedLead(null); setLeadView("VIEW_LEAD_LIST"); };
  const handleBackToSummary = () => { setSelectedLead(null); setLeadView("VIEW_SUMMARY"); setShowPaymentHistory(false); };
  
  const handleProceedToPaymentAck = (lead: LeadCardItem) => {
    setConversionLead(lead);
    setActiveTab("workflow");
    setWorkflowStage(2);
  };
  
  const handleLogout = async () => { await logout(); router.replace("/login"); };

  // Lead submit 
  const handleLeadSubmit = async () => {
    if (!leadForm.customerFullName.trim() || !leadForm.customerIdNumber.trim() || !leadForm.customerPhone.trim() || !leadForm.bikeModel || !leadForm.paymentType) {
      Alert.alert("Missing", "All required fields (*) must be filled."); return;
    }
    setWfSubmitting(true); setWfMessage(null); setWfError(null);
    try {
      const payload: Record<string,string> = {
        customerFullName:leadForm.customerFullName,customerIdNumber:leadForm.customerIdNumber,customerPhone:leadForm.customerPhone,
        bikeModel:leadForm.bikeModel,paymentType:leadForm.paymentType,quantityInterested:leadForm.quantityInterested,
        residenceLocation:leadForm.residenceLocation,county:leadForm.county,leadNotes:leadForm.leadNotes,
        duplicateOverrideReason:leadForm.duplicateOverrideReason,freelancerCode:activeCode,
      };
      await submitLead(payload);
      setWfMessage(`Lead created for ${leadForm.customerFullName}!`);
      setLeadForm({ customerFullName:"",customerIdNumber:"",customerPhone:"",bikeModel:"",paymentType:"",quantityInterested:"1",residenceLocation:"",county:"",leadNotes:"",duplicateOverrideReason:"" });
      loadDashboard(activeCode, true);
    } catch (err: any) { setWfError(err.message); }
    finally { setWfSubmitting(false); }
  };

  const handlePaymentAcknowledge = async () => {
    if (!paymentCode.trim()) { Alert.alert("Missing","Payment code required."); return; }
    setWfSubmitting(true); setWfError(null);
    const code = paymentCode.trim().toUpperCase();
    try {
      await acknowledgePayment({ paymentCode:code,receiptUrl:paymentReceiptUrl,notes:paymentNotes });
      setPaymentDone(true); setPaymentSubCode(code);
      loadDashboard(activeCode,true);
    } catch (err:any) { setWfError(err.message); }
    finally { setWfSubmitting(false); }
  };

  const handleDownloadReceipt = async () => {
    if (!paymentSubCode) return;
    try { await downloadReceipt(paymentSubCode); }
    catch {}
  };

  useEffect(() => {
    if (sessionCode && !dashboard && !dashLoading) {
      loadDashboard(sessionCode);
    }
  }, [sessionCode]);

  const handleReload = () => loadDashboard(codeInput);

  const metrics = dashboard?.metrics;
  const freelancer = dashboard?.freelancer;
  const payments = dashboard?.payments || [];

  return (
    <View style={s.container}>
      <ScrollView 
        style={s.scroll} 
        contentContainerStyle={{ paddingBottom:50 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(activeCode,true).finally(()=>setRefreshing(false)); }} tintColor={COLORS.gradientStart} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>{freelancer?.full_name || "Dashboard"}</Text>
            {freelancer?.display_code ? <View style={s.codeBadge}><Text style={s.codeBadgeText}>{freelancer.display_code}</Text></View> : null}
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}><Text style={s.logoutText}>Logout</Text></TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity onPress={() => { setActiveTab("cards"); setLeadView("VIEW_SUMMARY"); }} style={[s.tabBtn, activeTab === "cards" && s.tabBtnActive]}>
            <Text style={[s.tabBtnText, activeTab === "cards" && s.tabBtnTextActive]}>Freelancer Dashboard</Text>
          </TouchableOpacity>
          {activeTab !== "workflow" && (
            <TouchableOpacity onPress={() => { setActiveTab("workflow"); setWorkflowStage(1); }} style={s.tabNewBtn}>
              <LinearGradient colors={[COLORS.gradientStart,COLORS.gradientEnd]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.tabNewGradient}>
                <Text style={s.tabNewText}>+ New Lead</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Code input */}
        <View style={s.codeRow}>
          <TextInput style={s.codeInput} value={codeInput} onChangeText={setCodeInput} placeholder="Switch freelancer code" placeholderTextColor="#94a3b8" autoCapitalize="characters" />
          <TouchableOpacity onPress={handleReload} style={s.codeGo}><Text style={s.codeGoText}>Go</Text></TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/(freelancer)/showroom")} style={s.showroomEntry}>
          <LinearGradient colors={["#07191D", "#102B30"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.showroomEntryGradient}>
            <View style={{ flex: 1 }}>
              <Text style={s.showroomEntryEyebrow}>NEW / VIRTUAL SHOWROOM</Text>
              <Text style={s.showroomEntryTitle}>Meet the bikes differently.</Text>
            </View>
            <Text style={s.showroomEntryArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {dashError && <View style={s.errorBanner}><Text style={s.errorText}>{dashError}</Text></View>}

        {/*  TAB: CARDS  */}
        {activeTab === "cards" && (
          <>
            {dashLoading && !dashboard && <View style={s.loadingBox}><ActivityIndicator color={COLORS.gradientStart} /><Text style={s.loadingText}>Loading dashboard...</Text></View>}

            {dashboard && leadView === "VIEW_SUMMARY" && (
              <>
                <View style={s.metricGrid}>
                  <MetricCard label="Total Leads" value={metrics?.total_leads_submitted??0} color="#0f172a" onPress={() => loadDetailData(activeCode,"total_leads_submitted")} />
                  <MetricCard label="Pending Processing" value={metrics?.pending_processing??0} color="#d97706" onPress={() => loadDetailData(activeCode,"pending_processing")} />
                  <MetricCard label="Paid Commissions" value={metrics?.paid_commissions??0} color="#059669" onPress={() => loadDetailData(activeCode,"paid_commissions")} />
                  <MetricCard label="Total Paid (KES)" value={formatCurrency(metrics?.total_paid_kes??0)} color="#059669" />
                </View>
                <TouchableOpacity onPress={() => setShowPaymentHistory(!showPaymentHistory)} style={[s.paymentCard,SHADOWS.cardSm]}>
                  <Text style={s.paymentCardLabel}>Payment History</Text>
                  <Text style={s.paymentCardValue}>{payments.length}</Text>
                  <Text style={s.paymentCardHint}>{showPaymentHistory ? "Hide ↑" : "View →"}</Text>
                </TouchableOpacity>
                {showPaymentHistory && (
                  <View style={s.paymentSection}>
                    <View style={s.paymentSectionHeader}>
                      <Text style={s.paymentSectionTitle}>Payment History</Text>
                      <TouchableOpacity onPress={() => setShowPaymentHistory(false)}><Text style={s.hideText}>← Hide</Text></TouchableOpacity>
                    </View>
                    {payments.length===0 ? <Text style={s.emptyText}>No payments yet.</Text> : payments.map(p=>(
                      <View key={p.payment_code} style={s.paymentRow}>
                        <View style={{flex:1}}><Text style={s.paymentCode}>{p.payment_code}</Text><Text style={s.paymentMeta}>{p.payment_date||"—"} · {formatCurrency(p.amount_paid_kes)}</Text></View>
                        <StatusBadge status="paid" />
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {leadView === "VIEW_LEAD_LIST" && (
              <View style={s.leadsSection}>
                <View style={s.leadsHeader}>
                  <TouchableOpacity onPress={handleBackToSummary} style={s.backBtn}><Text style={s.backBtnText}>← Back to Summary</Text></TouchableOpacity>
                  <Text style={s.leadsTitle}>My Leads ({detailData?.leads.length??0})</Text>
                </View>
                {detailLoading && !detailData && <ActivityIndicator color={COLORS.gradientStart} style={{marginVertical:20}} />}
                {detailData && detailData.leads.length===0 && <Text style={s.emptyText}>No leads found in this category.</Text>}
                {detailData && detailData.leads.map(lead=>(
                  <TouchableOpacity key={lead.id} onPress={()=>handleLeadRowClick(lead)} style={[s.leadCard,SHADOWS.cardSm]}>
                    <View style={s.leadCardTop}>
                      <View style={{flex:1}}><Text style={s.leadCardName}>{lead.customer_full_name}</Text><Text style={s.leadCode}>{lead.lead_code}</Text></View>
                      <StatusBadge status={lead.invoice_status||lead.lead_status} />
                    </View>
                    <View style={s.leadCardMeta}>
                      <Text style={[s.leadCardMetaText,{fontWeight:"600",color:"#334155"}]}>{lead.payment_type==="cash"?"Cash":"Loan"}</Text>
                      <Text style={s.leadCardMetaText}>Qty: {lead.quantity_purchased??lead.quantity_interested}</Text>
                      {(lead.location||lead.county) ? <Text style={s.leadCardMetaText} numberOfLines={1}>{lead.location}{lead.county?`, ${lead.county}`:""}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {leadView === "VIEW_LEAD_DETAIL" && selectedLead && (
              <LeadDetailCard lead={selectedLead} onBack={handleBackToLeadsList} onProceedToPaymentAck={handleProceedToPaymentAck} />
            )}
          </>
        )}

        {/*  TAB: WORKFLOW  */}
        {activeTab === "workflow" && (
          <View style={s.workflowSection}>
            {/* Stepper with Lucide Icons */}
            <View style={s.stepper}>
              {WORKFLOW_STEPS.map((step,idx) => {
                const isActive = step.stage===workflowStage;
                const isComplete = step.stage<workflowStage;
                const IconComponent = step.icon;
                return (
                  <View key={step.stage} style={s.stepWrap}>
                    <TouchableOpacity onPress={()=>setWorkflowStage(step.stage)} style={[s.stepCircle, isActive&&{backgroundColor:"#3b4aff"}, isComplete&&{backgroundColor:"#10b981"}, !isActive&&!isComplete&&{backgroundColor:"#e2e8f0"}]}>
                      {isComplete ? <Check size={20} color="#fff" /> : <IconComponent size={20} color={isActive ? "#fff" : "#94a3b8"} />}
                    </TouchableOpacity>
                    <Text style={[s.stepLabel,isActive&&{color:"#3b4aff",fontWeight:"700"}]}>{step.label}</Text>
                    {idx < 1 && <View style={[s.stepLine,isComplete&&{backgroundColor:"#10b981"}]} />}
                  </View>
                );
              })}
            </View>

            {wfMessage && <View style={s.successBanner}><Text style={s.successText}>{wfMessage}</Text></View>}
            {wfError && <View style={s.wfErrorBanner}><Text style={s.wfErrorText}>{wfError}</Text></View>}

            {/* STAGE 1: LEAD CREATION */}
            {workflowStage===1 && (
              <View style={s.stageCard}>
                <Text style={s.stageTitle}>Step 1: Lead Creation</Text>
                <Text style={s.stageDesc}>Submit a new customer lead.</Text>
                <View style={s.formGrid}>
                  <View style={s.fieldGroup}><Text style={s.fieldLabel}>Customer Full Name *</Text><TextInput style={s.input} value={leadForm.customerFullName} onChangeText={v=>setLeadForm(p=>({...p,customerFullName:v}))} placeholder="Customer Full Name *" placeholderTextColor="#94a3b8" /></View>
                  <View style={s.fieldGroup}><Text style={s.fieldLabel}>Customer ID Number / KRA PIN *</Text><TextInput style={s.input} value={leadForm.customerIdNumber} onChangeText={v=>setLeadForm(p=>({...p,customerIdNumber:v}))} placeholder="Customer ID Number / KRA PIN *" placeholderTextColor="#94a3b8" /></View>
                  <View style={s.fieldGroup}><Text style={s.fieldLabel}>Customer Phone *</Text><TextInput style={s.input} value={leadForm.customerPhone} onChangeText={v=>setLeadForm(p=>({...p,customerPhone:v}))} placeholder="Customer Phone *" placeholderTextColor="#94a3b8" keyboardType="phone-pad" /></View>
                  
                  {/* DropDownPicker */}
                  <View style={[s.fieldGroup, { zIndex: 3000 }]}>
                    <Text style={s.fieldLabel}>Bike Model *</Text>
                    <DropDownPicker
                      open={leadBikeOpen}
                      value={leadForm.bikeModel || null}
                      items={bikeItems}
                      setOpen={setLeadBikeOpen}
                      setValue={(val: any) => setLeadForm(p => ({ ...p, bikeModel: typeof val === 'function' ? val(p.bikeModel) : val }))}
                      setItems={setBikeItems}
                      placeholder="Select Bike Model *"
                      style={s.dropdown}
                      textStyle={s.dropdownText}
                      dropDownContainerStyle={s.dropdownContainer}
                      zIndex={3000}
                      zIndexInverse={1000}
                      listMode="SCROLLVIEW"
                    />
                  </View>

                  {/* DropDownPicker */}
                  <View style={[s.fieldGroup, { zIndex: 2000 }]}>
                    <Text style={s.fieldLabel}>Payment Type *</Text>
                    <DropDownPicker
                      open={leadPaymentOpen}
                      value={leadForm.paymentType || null}
                      items={paymentItems}
                      setOpen={setLeadPaymentOpen}
                      setValue={(val: any) => setLeadForm(p => ({ ...p, paymentType: typeof val === 'function' ? val(p.paymentType) : val }))}
                      setItems={setPaymentItems}
                      placeholder="Select Payment Type *"
                      style={s.dropdown}
                      textStyle={s.dropdownText}
                      dropDownContainerStyle={s.dropdownContainer}
                      zIndex={2000}
                      zIndexInverse={2000}
                      listMode="SCROLLVIEW"
                    />
                  </View>

                  <View style={s.fieldGroup}><Text style={s.fieldLabel}>Quantity *</Text><TextInput style={s.input} value={leadForm.quantityInterested} onChangeText={v=>setLeadForm(p=>({...p,quantityInterested:v.replace(/[^0-9]/g,"")}))} placeholder="1" placeholderTextColor="#94a3b8" keyboardType="number-pad" /></View>
                  <View style={s.fieldGroup}><Text style={s.fieldLabel}>Residence Location (optional)</Text><TextInput style={s.input} value={leadForm.residenceLocation} onChangeText={v=>setLeadForm(p=>({...p,residenceLocation:v}))} placeholder="Residence Location (optional)" placeholderTextColor="#94a3b8" /></View>
                  <View style={s.fieldGroup}><Text style={s.fieldLabel}>County (optional)</Text><TextInput style={s.input} value={leadForm.county} onChangeText={v=>setLeadForm(p=>({...p,county:v}))} placeholder="County (optional)" placeholderTextColor="#94a3b8" /></View>
                </View>
                <View style={s.fieldGroup}><Text style={s.fieldLabel}>Lead notes / remarks (optional)</Text><TextInput style={[s.input,{minHeight:80,textAlignVertical:"top"}]} value={leadForm.leadNotes} onChangeText={v=>setLeadForm(p=>({...p,leadNotes:v}))} placeholder="Lead notes / remarks (optional)" placeholderTextColor="#94a3b8" multiline /></View>
                <View style={s.fieldGroup}><Text style={s.fieldLabel}>Duplicate override reason (optional)</Text><TextInput style={[s.input,{minHeight:60,textAlignVertical:"top"}]} value={leadForm.duplicateOverrideReason} onChangeText={v=>setLeadForm(p=>({...p,duplicateOverrideReason:v}))} placeholder="Duplicate override reason (optional)" placeholderTextColor="#94a3b8" multiline /></View>
                <TouchableOpacity onPress={handleLeadSubmit} disabled={wfSubmitting} style={[s.submitBtn,wfSubmitting&&{opacity:.5}]}>
                  {wfSubmitting?<ActivityIndicator color="#fff" />:<Text style={s.submitBtnText}>Create Lead</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* STAGE 2: PAYMENT ACKNOWLEDGEMENT (Formerly Stage 4) */}
            {workflowStage===2 && (
              <View style={s.stageCard}>
                {paymentDone ? (
                  <View style={s.successScreen}>
                    <View style={s.successCircle}><CheckCircle size={32} color="#059669" /></View>
                    <Text style={s.successTitle}>Payment Acknowledged Successfully</Text>
                    <Text style={s.successDesc}>Your payment has been acknowledged. Download your receipt below.</Text>
                    {paymentSubCode && <TouchableOpacity onPress={handleDownloadReceipt} style={[s.receiptBtn,{marginTop:16}]}><Text style={s.receiptBtnText}>Download Receipt PDF ({paymentSubCode})</Text></TouchableOpacity>}
                    <TouchableOpacity onPress={()=>{setPaymentDone(false);setActiveTab("cards");setLeadView("VIEW_SUMMARY");}} style={[s.submitBtn,{marginTop:12}]}><Text style={s.submitBtnText}>Go to Dashboard →</Text></TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={s.stageTitle}>Step 2: Payment Acknowledged</Text>
                    <Text style={s.stageDesc}>Confirm you have received the commission payment.</Text>
                    <View style={s.fieldGroup}><Text style={s.fieldLabel}>Payment Code *</Text><TextInput style={s.input} value={paymentCode} onChangeText={setPaymentCode} placeholder="Payment code" placeholderTextColor="#94a3b8" autoCapitalize="characters" /></View>
                    <View style={s.fieldGroup}><Text style={s.fieldLabel}>Receipt URL (optional)</Text><TextInput style={s.input} value={paymentReceiptUrl} onChangeText={setPaymentReceiptUrl} placeholder="Receipt URL (optional)" placeholderTextColor="#94a3b8" /></View>
                    <View style={s.fieldGroup}><Text style={s.fieldLabel}>Notes</Text><TextInput style={[s.input,{minHeight:80,textAlignVertical:"top"}]} value={paymentNotes} onChangeText={setPaymentNotes} placeholder="Notes" placeholderTextColor="#94a3b8" multiline /></View>
                    <TouchableOpacity onPress={handlePaymentAcknowledge} disabled={wfSubmitting} style={[s.submitBtn,wfSubmitting&&{opacity:.5}]}>{wfSubmitting?<ActivityIndicator color="#fff" />:<Text style={s.submitBtnText}>Acknowledge Payment</Text>}</TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// STYLES

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f8fafc" },
  scroll: { flex:1, paddingHorizontal:16, paddingTop:60 },
  header: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:16 },
  headerLeft: { flexDirection:"row", alignItems:"center", gap:8, flex:1 },
  headerTitle: { fontSize:22, fontWeight:"700", color:"#0f172a" },
  codeBadge: { backgroundColor:"#d1fae5", paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  codeBadgeText: { fontFamily:Platform.OS==="ios"?"Menlo":"monospace", fontSize:10, fontWeight:"700", color:"#065f46" },
  logoutBtn: { borderWidth:1, borderColor:"#e2e8f0", paddingHorizontal:12, paddingVertical:6, borderRadius:8 },
  logoutText: { fontSize:12, color:"#64748b" },
  tabRow: { flexDirection:"row", gap:8, marginBottom:12 },
  tabBtn: { flex:1, borderWidth:1, borderColor:"#e2e8f0", borderRadius:8, paddingVertical:12, alignItems:"center", backgroundColor:"#fff" },
  tabBtnActive: { backgroundColor:COLORS.info, borderColor:COLORS.info },
  tabBtnText: { fontSize:13, fontWeight:"600", color:"#64748b" },
  tabBtnTextActive: { color:"#fff" },
  tabNewBtn: { borderRadius:8, overflow:"hidden" },
  tabNewGradient: { paddingVertical:12, paddingHorizontal:16 },
  tabNewText: { fontSize:13, fontWeight:"700", color:"#fff" },
  codeRow: { flexDirection:"row", gap:8, marginBottom:12 },
  codeInput: { flex:1, borderWidth:1, borderColor:"#cbd5e1", borderRadius:8, paddingHorizontal:12, paddingVertical:8, fontSize:13, color:"#0f172a" },
  codeGo: { backgroundColor:COLORS.gradientStart, paddingHorizontal:20, paddingVertical:8, borderRadius:8, justifyContent:"center" },
  codeGoText: { color:"#fff", fontWeight:"700", fontSize:13 },
  showroomEntry: { marginBottom:12, borderRadius:12, overflow:"hidden", borderWidth:1, borderColor:"#164E58" },
  showroomEntryGradient: { minHeight:72, paddingHorizontal:16, paddingVertical:14, flexDirection:"row", alignItems:"center" },
  showroomEntryEyebrow: { color:"#37E6FF", fontSize:9, fontWeight:"900", letterSpacing:1.4, marginBottom:5 },
  showroomEntryTitle: { color:"#fff", fontSize:15, fontWeight:"800" },
  showroomEntryArrow: { color:"#37E6FF", fontSize:26, fontWeight:"300", marginLeft:12 },
  loadingBox: { padding:24, alignItems:"center" },
  loadingText: { marginTop:8, fontSize:13, color:"#64748b" },
  errorBanner: { backgroundColor:"#fee2e2", borderRadius:8, padding:12, marginBottom:12 },
  errorText: { color:"#991b1b", fontSize:13, fontWeight:"600", textAlign:"center" },
  metricGrid: { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:12 },
  paymentCard: { backgroundColor:"#fff", borderWidth:1, borderColor:"#e2e8f0", borderRadius:12, padding:16, marginBottom:12 },
  paymentCardLabel: { fontSize:10, fontWeight:"600", color:"#64748b", textTransform:"uppercase" },
  paymentCardValue: { fontSize:24, fontWeight:"700", color:"#7c3aed", marginTop:4 },
  paymentCardHint: { position:"absolute", bottom:8, right:12, fontSize:10, color:"#cbd5e1" },
  paymentSection: { backgroundColor:"#fff", borderWidth:1, borderColor:"#e2e8f0", borderRadius:12, padding:16, marginBottom:16 },
  paymentSectionHeader: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  paymentSectionTitle: { fontSize:16, fontWeight:"700", color:"#0f172a" },
  hideText: { fontSize:12, color:"#64748b" },
  paymentRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:"#f8fafc", borderRadius:8, padding:12, marginBottom:8, borderWidth:1, borderColor:"#f1f5f9" },
  paymentCode: { fontSize:14, fontWeight:"600", color:"#0f172a" },
  paymentMeta: { fontSize:11, color:"#64748b", marginTop:2 },
  emptyText: { fontSize:13, color:"#64748b", textAlign:"center", padding:24 },
  leadsSection: { marginTop:8 },
  leadsHeader: { flexDirection:"row", alignItems:"center", gap:12, marginBottom:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:"#f1f5f9" },
  backBtn: { borderWidth:1, borderColor:"#e2e8f0", borderRadius:8, paddingHorizontal:12, paddingVertical:6, backgroundColor:"#f8fafc" },
  backBtnText: { fontSize:12, fontWeight:"600", color:"#475569" },
  leadsTitle: { fontSize:16, fontWeight:"700", color:"#0f172a" },
  leadCard: { backgroundColor:"#fff", borderWidth:1, borderColor:"#f1f5f9", borderRadius:12, padding:16, marginBottom:10 },
  leadCardTop: { flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between", gap:8 },
  leadCardName: { fontSize:14, fontWeight:"600", color:"#0f172a" },
  leadCode: { fontFamily:Platform.OS==="ios"?"Menlo":"monospace", fontSize:11, color:"#64748b", marginTop:2 },
  leadCardMeta: { flexDirection:"row", alignItems:"center", gap:12, marginTop:8 },
  leadCardMetaText: { fontSize:11, color:"#64748b" },
  workflowSection: { marginTop:8 },
  stepper: { flexDirection:"row", alignItems:"flex-start", marginBottom:20 },
  stepWrap: { flex:1, alignItems:"center", position:"relative" },
  stepCircle: { width:40, height:40, borderRadius:20, alignItems:"center", justifyContent:"center" },
  stepLabel: { fontSize:9, fontWeight:"600", color:"#64748b", marginTop:4, textAlign:"center", textTransform:"uppercase" },
  stepLine: { position:"absolute", top:20, right:-4, width:8, height:2, backgroundColor:"#e2e8f0" },
  stageCard: { backgroundColor:"#fff", borderWidth:1, borderColor:"#e2e8f0", borderRadius:16, padding:20 },
  stageTitle: { fontSize:18, fontWeight:"700", color:"#0f172a", marginBottom:4 },
  stageDesc: { fontSize:13, color:"#64748b", marginBottom:16 },
  formGrid: { gap:14 },
  fieldGroup: { marginBottom:4 },
  fieldLabel: { fontSize:11, fontWeight:"600", color:"#475569", marginBottom:6 },
  input: { borderWidth:1, borderColor:"#cbd5e1", borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, color:"#0f172a", backgroundColor:"#fff" },
  dropdown: { borderColor: "#cbd5e1", borderRadius: 8, height: 48, backgroundColor: "#fff" },
  dropdownText: { fontSize: 14, color: "#0f172a" },
  dropdownContainer: { borderColor: "#cbd5e1", backgroundColor: "#fff" },
  hint: { fontSize:10, color:"#94a3b8", marginTop:2 },
  inlineError: { fontSize:10, color:"#dc2626", marginTop:2 },
  submitBtn: { marginTop:16, backgroundColor:COLORS.gradientStart, paddingVertical:14, borderRadius:12, alignItems:"center" },
  submitBtnText: { color:"#fff", fontSize:15, fontWeight:"700" },
  filePickerBtn: { borderWidth:1, borderColor:"#cbd5e1", borderRadius:8, borderStyle:"dashed", paddingVertical:14, alignItems:"center", backgroundColor:"#f8fafc" },
  filePickerText: { fontSize:13, color:"#64748b" },
  fileAttached: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", borderWidth:1, borderColor:"#cbd5e1", borderRadius:8, padding:10, backgroundColor:"#f0fdf4" },
  fileName: { fontSize:13, color:"#166534", flex:1, marginRight:8 },
  removeFile: { fontSize:12, fontWeight:"600", color:"#dc2626" },
  successScreen: { alignItems:"center", paddingVertical:20 },
  successCircle: { width:64, height:64, borderRadius:32, backgroundColor:"#d1fae5", alignItems:"center", justifyContent:"center", marginBottom:12 },
  successTitle: { fontSize:18, fontWeight:"700", color:"#0f172a", marginBottom:8, textAlign:"center" },
  successDesc: { fontSize:13, color:"#475569", textAlign:"center", lineHeight:20, marginBottom:8 },
  successSubtext: { fontSize:11, color:"#94a3b8", textAlign:"center", marginTop:8 },
  contextBox: { borderWidth:1, borderColor:"#e2e8f0", borderRadius:8, backgroundColor:"#f8fafc", padding:16, marginBottom:16 },
  contextTitle: { fontSize:10, fontWeight:"600", color:"#64748b", textTransform:"uppercase", marginBottom:10 },
  contextGrid: { gap:12 },
  contextLabel: { fontSize:11, color:"#94a3b8", marginBottom:2 },
  contextValue: { fontSize:14, fontWeight:"600", color:"#0f172a" },
  invoiceBox: { borderWidth:1, borderColor:"#bfdbfe", borderRadius:12, backgroundColor:"#eff6ff", padding:16 },
  invoiceBoxTitle: { fontSize:12, fontWeight:"700", color:"#1d4ed8", textTransform:"uppercase", marginBottom:12 },
  invoiceGrid: { gap:10 },
  invoiceLabel: { fontSize:10, fontWeight:"600", color:"#64748b" },
  invoiceValue: { fontFamily:Platform.OS==="ios"?"Menlo":"monospace", fontSize:13, fontWeight:"700", color:"#0f172a", marginTop:2 },
  claimPendingBox: { borderWidth:1, borderColor:"#67e8f9", borderRadius:12, backgroundColor:"#ecfeff", padding:20, alignItems:"center", marginTop:12 },
  claimPendingTitle: { fontSize:14, fontWeight:"700", color:"#155e75" },
  claimPendingText: { fontSize:12, color:"#0e7490", textAlign:"center", marginTop:8 },
  claimHint: { fontSize:10, color:"#3b82f6", textAlign:"center", marginTop:4 },
  receiptBtn: { borderWidth:2, borderColor:COLORS.gradientStart, borderRadius:12, paddingVertical:14, alignItems:"center", backgroundColor:"#fff" },
  receiptBtnText: { fontSize:14, fontWeight:"700", color:COLORS.gradientStart },
  successBanner: { backgroundColor:"#d1fae5", borderRadius:8, padding:12, borderWidth:1, borderColor:"#a7f3d0", marginBottom:12 },
  successText: { fontSize:13, fontWeight:"700", color:"#065f46", textAlign:"center" },
  wfErrorBanner: { backgroundColor:"#fee2e2", borderRadius:8, padding:12, borderWidth:1, borderColor:"#fecaca", marginBottom:12 },
  wfErrorText: { fontSize:13, fontWeight:"700", color:"#991b1b", textAlign:"center" },
});