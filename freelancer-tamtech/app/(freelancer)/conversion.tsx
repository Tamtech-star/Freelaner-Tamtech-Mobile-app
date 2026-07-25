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

export default function ConversionScreen() {
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    leadCode: "",
    invoiceNumber: "",
    saleDate: new Date().toISOString().split("T")[0],
    quantity: "1",
    bikeModel: "",
  })

  const handleSubmit = async () => {
    if (!form.leadCode.trim() || !form.invoiceNumber.trim()) {
      Alert.alert("Missing fields", "Lead code and invoice number are required.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("https://api.spirospares.com/api/portal/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadCode: form.leadCode,
          invoiceNumber: form.invoiceNumber,
          saleDate: form.saleDate,
          quantity: parseInt(form.quantity),
          bikeModel: form.bikeModel,
          freelancerCode: user?.code || "—",
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Conversion failed")
      }
      Alert.alert("Success", "Sale conversion submitted!", [
        { text: "OK", onPress: () => router.back() },
      ])
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

      <Text style={s.title}>Sale Conversion</Text>
      <Text style={s.sub}>Record a sale from an existing lead</Text>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Lead Code *</Text>
        <TextInput
          style={s.input}
          value={form.leadCode}
          onChangeText={(v) => setForm((p) => ({ ...p, leadCode: v.toUpperCase() }))}
          placeholder="e.g. LEAD-JNM-001"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
        />
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Bike Model</Text>
        <TextInput
          style={s.input}
          value={form.bikeModel}
          onChangeText={(v) => setForm((p) => ({ ...p, bikeModel: v }))}
          placeholder="e.g. EKON450M1V2"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Invoice Number *</Text>
        <TextInput
          style={s.input}
          value={form.invoiceNumber.replace(/^INV-/, "")}
          onChangeText={(v) => {
            const raw = v.replace(/[^0-9]/g, "")
            setForm((p) => ({ ...p, invoiceNumber: raw ? `INV-${raw}` : "" }))
          }}
          placeholder="600"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
        />
        <Text style={s.hint}>INV- prefix added automatically</Text>
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Sale Date *</Text>
        <TextInput
          style={s.input}
          value={form.saleDate}
          onChangeText={(v) => setForm((p) => ({ ...p, saleDate: v }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Quantity</Text>
        <TextInput
          style={s.input}
          value={form.quantity}
          onChangeText={(v) => setForm((p) => ({ ...p, quantity: v.replace(/[^0-9]/g, "") }))}
          placeholder="1"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
        />
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={[s.submitBtn, submitting && { opacity: 0.5 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.submitBtnText}>Submit Conversion</Text>
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
  hint: { fontSize: 10, color: COLORS.light, marginTop: 2 },
  submitBtn: {
    marginTop: 12,
    backgroundColor: COLORS.gradientStart,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
})
