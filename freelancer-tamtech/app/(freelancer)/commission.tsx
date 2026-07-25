import { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { useAuthStore } from "../../src/store/authStore"
import { COLORS } from "../../src/constants/config"

export default function CommissionScreen() {
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [leadId, setLeadId] = useState("")
  const [result, setResult] = useState<string | null>(null)

  const handleClaim = async () => {
    if (!leadId.trim()) {
      Alert.alert("Missing", "Enter a lead ID to claim commission.")
      return
    }
    setSubmitting(true)
    setResult(null)

    try {
      // Auto-submit commission claim
      const res = await fetch(
        "https://api.spirospares.com/api/portal/commissions/auto-submit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, freelancerCode: user?.code || "—" }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Claim submission failed.")
      }

      // Download invoice PDF (web only in real app, here just confirm)
      try {
        await fetch("https://api.spirospares.com/api/portal/commissions/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        })
      } catch {
        // PDF download may not work on mobile
      }

      setResult("✅ Commission claim submitted! Awaiting admin review.")
      setLeadId("")
    } catch (err: any) {
      Alert.alert("Error", err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.title}>Commission Claim</Text>
      <Text style={s.sub}>Auto-submit a commission request for a converted lead</Text>

      {result && (
        <View style={s.successBox}>
          <Text style={s.successText}>{result}</Text>
        </View>
      )}

      <View style={s.fieldGroup}>
        <Text style={s.label}>Lead ID *</Text>
        <TextInput
          style={s.input}
          value={leadId}
          onChangeText={setLeadId}
          placeholder="e.g. lead-3"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <TouchableOpacity
        onPress={handleClaim}
        disabled={submitting}
        style={[s.submitBtn, submitting && { opacity: 0.5 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.submitBtnText}>Submit Commission Claim</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: "600", color: COLORS.gradientStart },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.heading, marginBottom: 4 },
  sub: { fontSize: 14, color: COLORS.muted, marginBottom: 20 },
  successBox: {
    backgroundColor: COLORS.successBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  successText: { fontSize: 14, fontWeight: "600", color: COLORS.success },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 6 },
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
  submitBtn: {
    marginTop: 12,
    backgroundColor: COLORS.gradientStart,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
})
