import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native"
import { router } from "expo-router"
import DropDownPicker from "react-native-dropdown-picker"
import { registerFreelancer, type FreelancerRegistrationPayload } from "../../src/api/auth"
import { COLORS, SHADOWS } from "../../src/constants/config"

const KENYAN_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri",
  "Samburu","Siaya","Taita Taveta","Tana River","Tharaka Nithi",
  "Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
]

export default function RegisterScreen() {
  const [form, setForm] = useState<FreelancerRegistrationPayload>({
    fullName: "",
    age: 25,
    sex: "male",
    occupation: "",
    email: "",
    mpesaPhone: "",
    alternatePhone: "",
    kraPin: "",
    nationalId: "",
    location: "",
    county: "Nairobi",
    address: "",
  })

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // DropDownPicker states
  const [sexOpen, setSexOpen] = useState(false)
  const [sexItems, setSexItems] = useState([
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
    { label: "Prefer not to say", value: "prefer_not_to_say" },
  ])

  const [occupationOpen, setOccupationOpen] = useState(false)
  const [occupationItems, setOccupationItems] = useState([
    { label: "Select occupation...", value: "" },
    { label: "Employed", value: "employed" },
    { label: "Self-Employed", value: "self_employed" },
    { label: "Student", value: "student" },
    { label: "Others", value: "others" },
  ])

  const [countyOpen, setCountyOpen] = useState(false)
  const [countyItems, setCountyItems] = useState(
    KENYAN_COUNTIES.map((c) => ({ label: c, value: c }))
  )

  const updateField = <K extends keyof FreelancerRegistrationPayload>(
    key: K,
    value: FreelancerRegistrationPayload[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const required: [keyof FreelancerRegistrationPayload, string][] = [
      ["fullName", "Full name"],
      ["occupation", "Occupation"],
      ["email", "Email"],
      ["mpesaPhone", "M-Pesa phone"],
      ["nationalId", "National ID"],
      ["location", "Location"],
      ["county", "County"],
      ["address", "Address"],
    ]

    for (const [key, label] of required) {
      if (!form[key]?.toString().trim()) {
        Alert.alert("Missing Field", `Please fill in: ${label}`)
        return
      }
    }

    if (form.age < 18 || form.age > 100) {
      Alert.alert("Invalid Age", "Age must be between 18 and 100.")
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await registerFreelancer(form)
      setSuccess(result.message || "Registration successful! Check your email for your freelancer code.")
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true} 
      >
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Freelancer Registration</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Join Tamtech-Freelancer team</Text>
          <Text style={s.cardSubtitle}>
            Complete your details to join our freelancer marketing network.
            All starred fields are required.
          </Text>

          {/* Full Name */}
          <View style={s.formGroup}>
            <Text style={s.label}>Full Name <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={form.fullName}
              onChangeText={(v) => updateField("fullName", v)}
              placeholder="e.g. Musa Simon"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          {/* Email */}
          <View style={s.formGroup}>
            <Text style={s.label}>Email <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              placeholder="e.g. musa@example.com"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Age + Sex row */}
          <View style={[s.row, { zIndex: 3000 }]}>
            <View style={[s.formGroup, { flex: 1 }]}>
              <Text style={s.label}>Age <Text style={s.required}>*</Text></Text>
              <TextInput
                style={s.input}
                value={String(form.age)}
                onChangeText={(v) => {
                  const num = parseInt(v, 10)
                  updateField("age", isNaN(num) ? 0 : num)
                }}
                placeholder="25"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="number-pad"
              />
            </View>

            {/* Fixed Sex Dropdown */}
            <View style={[s.formGroup, { flex: 1, zIndex: 3000 }]}>
              <Text style={s.label}>Sex <Text style={s.required}>*</Text></Text>
              <DropDownPicker
                open={sexOpen}
                value={form.sex}
                items={sexItems}
                setOpen={setSexOpen}
                setValue={(cb) => {
                  const v = typeof cb === "function" ? cb(form.sex) : cb
                  updateField("sex", v)
                }}
                setItems={setSexItems}
                style={s.dropdown}
                dropDownContainerStyle={s.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
          </View>

          {/* Fixed Occupation Dropdown */}
          <View style={[s.formGroup, { zIndex: 2000 }]}>
            <Text style={s.label}>Occupation <Text style={s.required}>*</Text></Text>
            <DropDownPicker
              open={occupationOpen}
              value={form.occupation}
              items={occupationItems}
              setOpen={setOccupationOpen}
              setValue={(cb) => {
                const v = typeof cb === "function" ? cb(form.occupation) : cb
                updateField("occupation", v)
              }}
              setItems={setOccupationItems}
              style={s.dropdown}
              dropDownContainerStyle={s.dropdownContainer}
              listMode="SCROLLVIEW"
              scrollViewProps={{ nestedScrollEnabled: true }}
              zIndex={2000}
              zIndexInverse={2000}
            />
          </View>

          {/* M-Pesa Phone */}
          <View style={s.formGroup}>
            <Text style={s.label}>M-Pesa Phone <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={form.mpesaPhone}
              onChangeText={(v) => updateField("mpesaPhone", v)}
              placeholder="e.g. 0712345678"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="phone-pad"
            />
          </View>

          {/* Alternate Phone */}
          <View style={s.formGroup}>
            <Text style={s.label}>Alternate Phone</Text>
            <TextInput
              style={s.input}
              value={form.alternatePhone}
              onChangeText={(v) => updateField("alternatePhone", v)}
              placeholder="Optional secondary number"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="phone-pad"
            />
          </View>

          {/* National ID */}
          <View style={s.formGroup}>
            <Text style={s.label}>National ID Number <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={form.nationalId}
              onChangeText={(v) => updateField("nationalId", v)}
              placeholder="e.g. 12345678"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          {/* KRA PIN */}
          <View style={s.formGroup}>
            <Text style={s.label}>KRA PIN</Text>
            <TextInput
              style={s.input}
              value={form.kraPin}
              onChangeText={(v) => updateField("kraPin", v)}
              placeholder="e.g. P051234567Z"
              placeholderTextColor={COLORS.placeholder}
              autoCapitalize="characters"
            />
          </View>

          {/* Location */}
          <View style={s.formGroup}>
            <Text style={s.label}>Location / Town <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={form.location}
              onChangeText={(v) => updateField("location", v)}
              placeholder="e.g. Kasarani"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          {/* Fixed County Dropdown - Using MODAL for massive list */}
          <View style={s.formGroup}>
            <Text style={s.label}>County <Text style={s.required}>*</Text></Text>
            <DropDownPicker
              open={countyOpen}
              value={form.county}
              items={countyItems}
              setOpen={setCountyOpen}
              setValue={(cb) => {
                const v = typeof cb === "function" ? cb(form.county) : cb
                updateField("county", v)
              }}
              setItems={setCountyItems}
              style={s.dropdown}
              listMode="MODAL"
              modalProps={{ animationType: "slide" }}
              modalTitle="Select your County"
              searchable={true}
              searchPlaceholder="Search county..."
            />
          </View>

          {/* Address */}
          <View style={s.formGroup}>
            <Text style={s.label}>Address <Text style={s.required}>*</Text></Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={form.address}
              onChangeText={(v) => updateField("address", v)}
              placeholder="Your full address"
              placeholderTextColor={COLORS.placeholder}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Messages */}
          {success && (
            <View style={s.successBanner}>
              <Text style={s.successText}>{success}</Text>
            </View>
          )}
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
            style={s.submitBtn}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitBtnText}>Submit Registration</Text>
            )}
          </TouchableOpacity>

          {success && (
            <TouchableOpacity
              style={s.backToLoginBtn}
              onPress={() => router.replace("/login")}
            >
              <Text style={s.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 24 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backText: { fontSize: 16, fontWeight: "600", color: COLORS.gradientStart },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.heading },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.card,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: COLORS.heading, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 20, lineHeight: 18 },

  formGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.body, marginBottom: 6 },
  required: { color: "#f43f5e" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.heading,
    backgroundColor: COLORS.inputBg,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },

  row: { flexDirection: "row", gap: 12 },

  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    height: 46,
    backgroundColor: COLORS.inputBg,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
  },

  successBanner: {
    marginTop: 16,
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 8,
    padding: 12,
  },
  successText: { fontSize: 14, fontWeight: "700", color: "#065f46", textAlign: "center" },
  errorBanner: {
    marginTop: 16,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
  },
  errorText: { fontSize: 14, fontWeight: "700", color: "#991b1b", textAlign: "center" },

  submitBtn: {
    marginTop: 20,
    backgroundColor: COLORS.gradientStart,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  backToLoginBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  backToLoginText: { fontSize: 14, fontWeight: "600", color: COLORS.gradientStart },
})