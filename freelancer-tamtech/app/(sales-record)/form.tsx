import { useState, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import DropDownPicker from "react-native-dropdown-picker"
import { useAuthStore } from "../../src/store/authStore"
import { submitSalesRecord } from "../../src/api/salesRecord"
import { lookupOpenLeadByCustomerId, autoSubmitCommission } from "../../src/api/portal"
import { COLORS, SHADOWS } from "../../src/constants/config"

//  Constants 
const BIKE_MODELS = [
  "EKON450M1V2",
  "EKON450M2V2",
  "EKON400M2",
  "EKON450M1",
  "VEO",
  "Other",
]

const INSURANCE_OPTIONS = ["No", "TPO PRIVATE", "TPO PSV", "COMP PRIVATE", "COMP PSV"]
const TRACKER_OPTIONS = ["No", "Yearly", "Lifetime"]
const COLORS_LIST = ["", "Green", "Blue", "Black", "Red", "Yellow"]

const today = new Date().toISOString().split("T")[0]

//  File attachment type 
type FileAttachment = {
  uri: string
  name: string
  type: string
  file?: File
}

//  Form state 
type FormState = {
  // Customer
  customerType: "individual" | "company"
  customerFullName: string
  customerIdNumber: string
  customerPhone: string
  kraPin: string
  customerLocation: string

  // Bike/Sale
  bikeModel: string
  bikeRegistrationNumber: string
  chassisNumber: string
  paymentType: "cash" | "loan"
  financeDetails: string
  bikeColor: string
  hasInsurance: string
  hasTracker: string
  referralName: string
  deploymentName: string

  // Invoice
  invoiceNumber: string
  saleDate: string
  quantity: string
}

const INITIAL_FORM: FormState = {
  customerType: "individual",
  customerFullName: "",
  customerIdNumber: "",
  customerPhone: "",
  kraPin: "",
  customerLocation: "",
  bikeModel: "",
  bikeRegistrationNumber: "",
  chassisNumber: "",
  paymentType: "cash",
  financeDetails: "",
  bikeColor: "",
  hasInsurance: "No",
  hasTracker: "No",
  referralName: "",
  deploymentName: "",
  invoiceNumber: "",
  saleDate: today,
  quantity: "1",
}

//  Document field config 
const DOCUMENT_FIELDS = [
  { key: "invoicePhoto", label: "Invoice Photo", required: false },
  { key: "salesAgreementPhoto", label: "Sales Agreement Photo", required: false },
  { key: "idDocument", label: "ID / Certificate of Incorporation", required: true },
  { key: "kraDocument", label: "KRA PIN Document", required: true },
  { key: "bikePhoto", label: "Bike Number Photo", required: true },
  { key: "chassisPhoto", label: "Chassis Photo", required: true },
] as const

//  Component 
export default function SalesRecordForm() {
  const { user } = useAuthStore()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [files, setFiles] = useState<Record<string, FileAttachment | null>>({})
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // DropDownPicker state for each picker
  const [customerTypeOpen, setCustomerTypeOpen] = useState(false)
  const [customerTypeItems, setCustomerTypeItems] = useState([
    { label: "Individual", value: "individual" },
    { label: "Company", value: "company" },
  ])

  const [bikeModelOpen, setBikeModelOpen] = useState(false)
  const [bikeModelItems, setBikeModelItems] = useState([
    { label: "Select model...", value: "" },
    ...BIKE_MODELS.map((m) => ({ label: m, value: m })),
  ])

  const [paymentTypeOpen, setPaymentTypeOpen] = useState(false)
  const [paymentTypeItems, setPaymentTypeItems] = useState([
    { label: "Cash", value: "cash" },
    { label: "Loan", value: "loan" },
  ])

  const [bikeColorOpen, setBikeColorOpen] = useState(false)
  const [bikeColorItems, setBikeColorItems] = useState(
    COLORS_LIST.map((c) => ({ label: c || "Select color...", value: c }))
  )

  const [hasInsuranceOpen, setHasInsuranceOpen] = useState(false)
  const [hasInsuranceItems, setHasInsuranceItems] = useState(
    INSURANCE_OPTIONS.map((o) => ({ label: o, value: o }))
  )

  const [hasTrackerOpen, setHasTrackerOpen] = useState(false)
  const [hasTrackerItems, setHasTrackerItems] = useState(
    TRACKER_OPTIONS.map((o) => ({ label: o, value: o }))
  )

  // ── Helper to update form field ──
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  //  Process Asset Helper
  const saveAsset = (fieldKey: string, asset: ImagePicker.ImagePickerAsset) => {
    setFiles((prev) => ({
      ...prev,
      [fieldKey]: {
        uri: asset.uri,
        name: asset.fileName || `${fieldKey}.jpg`,
        type: asset.mimeType || "image/jpeg",
      },
    }))
  }

  //  Pick file (Camera vs Gallery Options)
  const handleAddFile = useCallback((fieldKey: string) => {
    Alert.alert(
      "Upload Document",
      "Would you like to take a photo or choose from your gallery?",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync()
            if (status !== "granted") {
              Alert.alert("Permission Denied", "Camera access is required to take photos.")
              return
            }
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ["images", "livePhotos"] as any,
                quality: 0.8,
              })
              if (!result.canceled && result.assets?.[0]) {
                saveAsset(fieldKey, result.assets[0])
              }
            } catch {
              Alert.alert("Error", "Failed to open camera.")
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images", "livePhotos"] as any,
                allowsMultipleSelection: false,
                quality: 0.8,
              })
              if (!result.canceled && result.assets?.[0]) {
                saveAsset(fieldKey, result.assets[0])
              }
            } catch {
              Alert.alert("Error", "Failed to pick file from gallery.")
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    )
  }, [])

  //  Remove file 
  const removeFile = useCallback((fieldKey: string) => {
    setFiles((prev) => ({ ...prev, [fieldKey]: null }))
  }, [])

  //  Build preview 
  const handlePreview = useCallback(() => {
    // Basic validation
    const requiredFields: [keyof FormState, string][] = [
      ["customerFullName", "Customer full name"],
      ["customerPhone", "Customer phone"],
      ["customerLocation", "Customer location"],
      ["bikeModel", "Bike model"],
      ["bikeRegistrationNumber", "Bike registration number"],
      ["chassisNumber", "Chassis number"],
      ["saleDate", "Sale date"],
    ]
    if (form.customerType === "company") {
      requiredFields.push(["kraPin", "KRA PIN (required for companies)"])
    }
    if (form.customerType === "individual") {
      requiredFields.push(["customerIdNumber", "Customer ID number"])
    }

    for (const [key, label] of requiredFields) {
      if (!form[key]?.toString().trim()) {
        Alert.alert("Missing Field", `Please fill in: ${label}`)
        return
      }
    }

    // Check required document uploads
    const requiredDocs = DOCUMENT_FIELDS.filter((d) => d.required)
    for (const doc of requiredDocs) {
      if (!files[doc.key]) {
        Alert.alert("Required Document", `Please upload: ${doc.label}`)
        return
      }
    }

    setPreview({ ...form })
  }, [form, files])

  //  Submit 
  const handleSubmit = useCallback(async () => {
    if (!preview) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append("submissionType", "direct_sale")
      formData.append("salesAgentName", user?.name || "internal-staff")

      // Customer fields
      formData.append("customerType", form.customerType)
      formData.append("customerFullName", form.customerFullName)
      formData.append("customerIdNumber", form.customerIdNumber)
      formData.append("customerPhone", form.customerPhone)
      formData.append("kraPin", form.kraPin)
      formData.append("customerLocation", form.customerLocation)

      // Bike/Sale fields
      formData.append("bikeModel", form.bikeModel)
      formData.append("bikeRegistrationNumber", form.bikeRegistrationNumber)
      formData.append("chassisNumber", form.chassisNumber)
      formData.append("paymentType", form.paymentType)
      formData.append("financeDetails", form.financeDetails)
      formData.append("bikeColor", form.bikeColor)
      formData.append("hasInsurance", form.hasInsurance)
      formData.append("hasTracker", form.hasTracker)
      formData.append("referralName", form.referralName)
      formData.append("deploymentName", form.deploymentName)

      // Invoice fields
      formData.append("invoiceNumber", form.invoiceNumber)
      formData.append("saleDate", form.saleDate)
      formData.append("quantity", form.quantity)

      // Files
      for (const field of DOCUMENT_FIELDS) {
        const file = files[field.key]
        if (file) {
          const response = await fetch(file.uri)
          const blob = await response.blob()
          formData.append(field.key, blob, file.name)
        }
      }

      const res = await fetch("https://api.spirospares.com/api/sales-record", {
        method: "POST",
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Submission failed.")
      }

      setSuccess(`Sale recorded successfully! Code: ${result.conversionCode}`)
      setPreview(null)
      setForm(INITIAL_FORM)
      setFiles({})
    } catch (err: any) {
      setError(err.message || "Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }, [preview, form, files, user])

  //  Render file picker button 
  const renderFilePicker = (field: (typeof DOCUMENT_FIELDS)[number]) => {
    const file = files[field.key]
    return (
      <View key={field.key} style={s.fileField}>
        <Text style={s.fieldLabel}>
          {field.label} {field.required && <Text style={s.required}>*</Text>}
        </Text>
        {file ? (
          <View style={s.fileAttached}>
            <Text style={s.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            <TouchableOpacity onPress={() => removeFile(field.key)} style={s.removeFileBtn}>
              <Text style={s.removeFileText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleAddFile(field.key)} style={s.filePickerBtn}>
            <Text style={s.filePickerText}>Tap to upload {field.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sales Record</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Agent Name (read-only) */}
        <View style={s.section}>
          <Text style={s.fieldLabel}>Sales Agent</Text>
          <View style={s.agentBadge}>
            <Text style={s.agentText}>{user?.name || "Agent"}</Text>
          </View>
        </View>

        {/* Customer Information Section */}
        <View style={[s.section, { zIndex: 6000 }]}>
          <Text style={s.sectionTitle}>Customer Information</Text>

          {/* Customer Type */}
          <View style={{ zIndex: 6000, marginBottom: 12 }}>
            <Text style={s.fieldLabel}>
              Customer Type <Text style={s.required}>*</Text>
            </Text>
            <DropDownPicker
              open={customerTypeOpen}
              value={form.customerType}
              items={customerTypeItems}
              setOpen={setCustomerTypeOpen}
              setValue={(cb) => {
                const v = typeof cb === "function" ? cb(form.customerType) : cb
                updateField("customerType", v)
              }}
              setItems={setCustomerTypeItems}
              style={s.dropdown}
              dropDownContainerStyle={s.dropdownContainer}
              listMode="SCROLLVIEW"
              scrollViewProps={{ nestedScrollEnabled: true }}
              zIndex={6000}
              zIndexInverse={7000}
            />
          </View>

          <View style={s.grid2}>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Full Name <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.customerFullName}
                onChangeText={(v) => updateField("customerFullName", v)}
                placeholder="John Kamau"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {form.customerType === "individual" && (
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>
                  ID Number <Text style={s.required}>*</Text>
                </Text>
                <TextInput
                  style={s.input}
                  value={form.customerIdNumber}
                  onChangeText={(v) => updateField("customerIdNumber", v)}
                  placeholder="e.g. 12345678"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {form.customerType === "company" && (
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>
                  KRA PIN <Text style={s.required}>*</Text>
                </Text>
                <TextInput
                  style={s.input}
                  value={form.kraPin}
                  onChangeText={(v) => updateField("kraPin", v)}
                  placeholder="e.g. P051234567Z"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Location <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.customerLocation}
                onChangeText={(v) => updateField("customerLocation", v)}
                placeholder="Nairobi, Kenya"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Phone <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.customerPhone}
                onChangeText={(v) => updateField("customerPhone", v)}
                placeholder="0712345678"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>

            {form.customerType === "individual" && (
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>KRA PIN</Text>
                <TextInput
                  style={s.input}
                  value={form.kraPin}
                  onChangeText={(v) => updateField("kraPin", v)}
                  placeholder="Optional for individuals"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
              </View>
            )}
          </View>
        </View>

        {/* Bike / Sale Details Section */}
        <View style={[s.section, { zIndex: 5000 }]}>
          <Text style={s.sectionTitle}>Bike / Sale Details</Text>
          <View style={s.grid2}>
            
            <View style={[s.fieldGroup, { zIndex: 5000 }]}>
              <Text style={s.fieldLabel}>
                Make / Model <Text style={s.required}>*</Text>
              </Text>
              <DropDownPicker
                open={bikeModelOpen}
                value={form.bikeModel}
                items={bikeModelItems}
                setOpen={setBikeModelOpen}
                setValue={(cb) => {
                  const v = typeof cb === "function" ? cb(form.bikeModel) : cb
                  updateField("bikeModel", v)
                }}
                setItems={setBikeModelItems}
                style={s.dropdown}
                dropDownContainerStyle={s.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={5000}
                zIndexInverse={6000}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Registration No. <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.bikeRegistrationNumber}
                onChangeText={(v) => updateField("bikeRegistrationNumber", v)}
                placeholder="e.g. KCA 123T"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Chassis Number <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.chassisNumber}
                onChangeText={(v) => updateField("chassisNumber", v)}
                placeholder="e.g. MHHEC450...12345"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />
            </View>

            <View style={[s.fieldGroup, { zIndex: 4000 }]}>
              <Text style={s.fieldLabel}>
                Payment Type <Text style={s.required}>*</Text>
              </Text>
              <DropDownPicker
                open={paymentTypeOpen}
                value={form.paymentType}
                items={paymentTypeItems}
                setOpen={setPaymentTypeOpen}
                setValue={(cb) => {
                  const v = typeof cb === "function" ? cb(form.paymentType) : cb
                  updateField("paymentType", v)
                }}
                setItems={setPaymentTypeItems}
                style={s.dropdown}
                dropDownContainerStyle={s.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={4000}
                zIndexInverse={5000}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Finance Details</Text>
              <TextInput
                style={s.input}
                value={form.financeDetails}
                onChangeText={(v) => updateField("financeDetails", v)}
                placeholder="e.g. Watu Loan 130000"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={[s.fieldGroup, { zIndex: 3000 }]}>
              <Text style={s.fieldLabel}>Bike Color</Text>
              <DropDownPicker
                open={bikeColorOpen}
                value={form.bikeColor}
                items={bikeColorItems}
                setOpen={setBikeColorOpen}
                setValue={(cb) => {
                  const v = typeof cb === "function" ? cb(form.bikeColor) : cb
                  updateField("bikeColor", v)
                }}
                setItems={setBikeColorItems}
                style={s.dropdown}
                dropDownContainerStyle={s.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={3000}
                zIndexInverse={4000}
              />
            </View>

            <View style={[s.fieldGroup, { zIndex: 2000 }]}>
              <Text style={s.fieldLabel}>Insurance</Text>
              <DropDownPicker
                open={hasInsuranceOpen}
                value={form.hasInsurance}
                items={hasInsuranceItems}
                setOpen={setHasInsuranceOpen}
                setValue={(cb) => {
                  const v = typeof cb === "function" ? cb(form.hasInsurance) : cb
                  updateField("hasInsurance", v)
                }}
                setItems={setHasInsuranceItems}
                style={s.dropdown}
                dropDownContainerStyle={s.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={2000}
                zIndexInverse={3000}
              />
            </View>

            <View style={[s.fieldGroup, { zIndex: 1000 }]}>
              <Text style={s.fieldLabel}>Tracker</Text>
              <DropDownPicker
                open={hasTrackerOpen}
                value={form.hasTracker}
                items={hasTrackerItems}
                setOpen={setHasTrackerOpen}
                setValue={(cb) => {
                  const v = typeof cb === "function" ? cb(form.hasTracker) : cb
                  updateField("hasTracker", v)
                }}
                setItems={setHasTrackerItems}
                style={s.dropdown}
                dropDownContainerStyle={s.dropdownContainer}
                listMode="SCROLLVIEW"
                scrollViewProps={{ nestedScrollEnabled: true }}
                zIndex={1000}
                zIndexInverse={1000}
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Referral Name</Text>
              <TextInput
                style={s.input}
                value={form.referralName}
                onChangeText={(v) => updateField("referralName", v)}
                placeholder="e.g. Rafael-Rider"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Deployment</Text>
              <TextInput
                style={s.input}
                value={form.deploymentName}
                onChangeText={(v) => updateField("deploymentName", v)}
                placeholder="e.g. Paul"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        {/* Invoice Details Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Invoice Details</Text>
          <View style={s.grid2}>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Invoice Number</Text>
              <TextInput
                style={s.input}
                value={form.invoiceNumber.replace(/^INV-/, "")}
                onChangeText={(v) => {
                  const raw = v.replace(/[^0-9]/g, "")
                  updateField("invoiceNumber", raw ? `INV-${raw}` : "")
                }}
                placeholder="600"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
              <Text style={s.hint}>Type just the number, INV- prefix added automatically</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Sale Date <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.saleDate}
                onChangeText={(v) => updateField("saleDate", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Quantity <Text style={s.required}>*</Text>
              </Text>
              <TextInput
                style={s.input}
                value={form.quantity}
                onChangeText={(v) => updateField("quantity", v.replace(/[^0-9]/g, ""))}
                placeholder="1"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Document Uploads Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Document Uploads</Text>
          <View style={s.grid2}>
            {DOCUMENT_FIELDS.map(renderFilePicker)}
          </View>
        </View>

        {/* Success / Error */}
        {!!success ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>{success}</Text>
          </View>
        ) : null}
        {!!error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity onPress={handlePreview} style={s.submitBtn} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>Preview & Confirm</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/*  Preview Modal  */}
      {!!preview ? (
        <View style={s.previewOverlay}>
          <ScrollView style={s.previewCard} contentContainerStyle={{ padding: 24 }}>
            <Text style={s.previewTitle}>Preview Direct Sale</Text>

            {!!error ? (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Customer Info */}
            <View style={s.previewSection}>
              <Text style={s.previewSectionTitle}>Customer Information</Text>
              <View style={s.grid2}>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Name: </Text>
                  {preview.customerFullName}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>ID: </Text>
                  {preview.customerIdNumber || "—"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>KRA PIN: </Text>
                  {preview.kraPin || "—"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Phone: </Text>
                  {preview.customerPhone}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Location: </Text>
                  {preview.customerLocation}
                </Text>
              </View>
            </View>

            {/* Bike/Sale Info */}
            <View style={s.previewSection}>
              <Text style={s.previewSectionTitle}>Bike / Sale Details</Text>
              <View style={s.grid2}>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Model: </Text>
                  {preview.bikeModel}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Registration: </Text>
                  {preview.bikeRegistrationNumber}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Chassis: </Text>
                  {preview.chassisNumber}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Payment: </Text>
                  {preview.paymentType}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Insurance: </Text>
                  {preview.hasInsurance !== "No" ? preview.hasInsurance : "No"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Tracker: </Text>
                  {preview.hasTracker !== "No" ? preview.hasTracker : "No"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Finance: </Text>
                  {preview.financeDetails || "—"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Referral: </Text>
                  {preview.referralName || "—"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Deployment: </Text>
                  {preview.deploymentName || "—"}
                </Text>
              </View>
            </View>

            {/* Invoice */}
            <View style={s.previewSection}>
              <Text style={s.previewSectionTitle}>Invoice</Text>
              <View style={s.grid2}>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Number: </Text>
                  {preview.invoiceNumber || "—"}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Date: </Text>
                  {preview.saleDate}
                </Text>
                <Text style={s.previewItem}>
                  <Text style={s.previewLabel}>Quantity: </Text>
                  {preview.quantity}
                </Text>
              </View>
            </View>

            {/* Documents */}
            <View style={s.previewSection}>
              <Text style={s.previewSectionTitle}>Documents</Text>
              {DOCUMENT_FIELDS.map((f) => (
                <Text key={f.key} style={s.previewItem}>
                  <Text style={s.previewLabel}>{f.label}: </Text>
                  {files[f.key]?.name || "Not uploaded"}
                </Text>
              ))}
            </View>

            {/* Actions */}
            <View style={s.previewActions}>
              <TouchableOpacity
                onPress={() => setPreview(null)}
                style={s.editBtn}
              >
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Confirm", "Are you sure you want to submit this sale record?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm & Submit", onPress: handleSubmit },
                  ])
                }}
                disabled={submitting}
                style={[s.confirmBtn, submitting && { opacity: 0.5 }]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm & Submit</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={s.previewNote}>
              This is a direct sale — no commission will be generated.
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  )
}

// ── Styles ──
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, fontWeight: "600", color: COLORS.gradientStart },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },

  scroll: { flex: 1, paddingHorizontal: 16 },

  section: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 },

  agentBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  agentText: { fontSize: 14, fontWeight: "700", color: "#1d4ed8" },

  grid2: { gap: 12 },
  fieldGroup: { marginBottom: 4 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 6 },
  required: { color: "#f43f5e" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    height: 48,
    backgroundColor: "#fff",
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  hint: { fontSize: 10, color: "#94a3b8", marginTop: 2 },

  // File pickers
  fileField: { marginBottom: 4 },
  filePickerBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderStyle: "dashed",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  filePickerText: { fontSize: 13, color: "#64748b" },
  fileAttached: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
  },
  fileName: { fontSize: 13, color: "#166534", flex: 1, marginRight: 8 },
  removeFileBtn: { padding: 4 },
  removeFileText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },

  // Success/Error banners
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

  // Preview Modal
  previewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  previewCard: {
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  previewTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  previewSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  previewItem: { fontSize: 14, color: "#334155", marginBottom: 4 },
  previewLabel: { fontWeight: "700", color: "#0f172a" },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
    marginTop: 8,
  },
  editBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  confirmBtn: {
    backgroundColor: COLORS.gradientStart,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  previewNote: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
})