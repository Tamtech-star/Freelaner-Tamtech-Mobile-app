import { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Directory, File, Paths } from "expo-file-system"
import DropDownPicker from "react-native-dropdown-picker"
import { useAuthStore } from "../../src/store/authStore"
import { COLORS, SHADOWS } from "../../src/constants/config"
import { insertPendingSalesRecord } from "../../src/offline/database"
import { buildPendingSalesRecord } from "../../src/offline/syncCore"
import { runSyncWorker, type OfflineSubmissionPayload } from "../../src/offline/syncWorker"
import { compressImageForUpload } from "../../src/utils/imageCompression"
import api from "../../src/api/client"

//  Constants 
const BIKE_MODELS = [
  "EKON450M1V2",
  "EKON450M2V2",
  "EKON400M2",
  "EKON450M1",
  "VEO",
  "EKON450M1V3",
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
  const params = useLocalSearchParams<{
    editId?: string
    customerFullName?: string
    bikeModel?: string
    paymentType?: string
    invoiceNumber?: string
    saleDate?: string
    quantity?: string
    invoicePhotoUrl?: string
    agreementPhotoUrl?: string
    idDocumentUrl?: string
    kraDocumentUrl?: string
    bikePhotoUrl?: string
    chassisPhotoUrl?: string
  }>()
  const { editId } = params
  const isEditing = Boolean(editId)
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    customerFullName: params.customerFullName || "",
    bikeModel: params.bikeModel || "",
    paymentType: params.paymentType === "loan" ? "loan" : "cash",
    invoiceNumber: params.invoiceNumber === "—" ? "" : params.invoiceNumber || "",
    saleDate: params.saleDate || today,
    quantity: params.quantity || "1",
  }))
  const [files, setFiles] = useState<Record<string, FileAttachment | null>>({})
  const [existingDocuments, setExistingDocuments] = useState<Record<string, string | null>>({
    invoicePhoto: params.invoicePhotoUrl || null,
    salesAgreementPhoto: params.agreementPhotoUrl || null,
    idDocument: params.idDocumentUrl || null,
    kraDocument: params.kraDocumentUrl || null,
    bikePhoto: params.bikePhotoUrl || null,
    chassisPhoto: params.chassisPhotoUrl || null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!editId) return
    let cancelled = false
    setSubmitting(true)
    void api.get(`/sales-record/${editId}`)
      .then(({ data }) => {
        if (cancelled) return
        const sale = data.sale || {}
        setForm({
          customerType: sale.customer_type || "individual",
          customerFullName: sale.customer_full_name || "",
          customerIdNumber: sale.customer_id_number || "",
          customerPhone: sale.customer_phone || "",
          kraPin: sale.kra_pin || "",
          customerLocation: sale.customer_location || "",
          bikeModel: sale.bike_model_sold || "",
          bikeRegistrationNumber: sale.bike_registration_number || "",
          chassisNumber: sale.chassis_number || "",
          paymentType: sale.payment_type || "cash",
          financeDetails: sale.finance_details || "",
          bikeColor: sale.bike_color || "",
          hasInsurance: sale.has_insurance ? sale.insurance_type || "TPO PRIVATE" : "No",
          hasTracker: sale.has_tracker ? sale.tracker_duration || "Yearly" : "No",
          referralName: sale.referral_name || "",
          deploymentName: sale.deployment_name || "",
          invoiceNumber: sale.invoice_number || "",
          saleDate: sale.invoice_date || today,
          quantity: String(sale.quantity_purchased || 1),
        })
        setExistingDocuments({
          invoicePhoto: sale.invoice_photo_url || null,
          salesAgreementPhoto: sale.sales_agreement_photo_url || null,
          idDocument: sale.id_document_url || null,
          kraDocument: sale.kra_document_url || null,
          bikePhoto: sale.bike_photo_url || null,
          chassisPhoto: sale.chassis_photo_url || null,
        })
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 404) {
          setError("The form is prefilled from sales history. Deploy the backend sales edit route before saving changes.")
          return
        }
        setError(err?.response?.data?.error || err?.message || "Failed to load additional sale details.")
      })
      .finally(() => { if (!cancelled) setSubmitting(false) })
    return () => { cancelled = true }
  }, [editId])

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
  const saveAsset = async (fieldKey: string, asset: ImagePicker.ImagePickerAsset) => {
    const compressed = await compressImageForUpload(
      asset.uri,
      asset.fileName || `${fieldKey}.jpg`,
      asset.mimeType || "image/jpeg",
      asset.width,
    )
    const outboxDirectory = new Directory(Paths.document, "sales-outbox")
    outboxDirectory.create({ idempotent: true, intermediates: true })
    const durableFile = new File(outboxDirectory, `${Date.now()}-${fieldKey}-${compressed.name}`)
    new File(compressed.uri).copy(durableFile)
    setFiles((prev) => ({
      ...prev,
      [fieldKey]: { ...compressed, uri: durableFile.uri },
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
                await saveAsset(fieldKey, result.assets[0])
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
                await saveAsset(fieldKey, result.assets[0])
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
    for (const doc of isEditing ? [] : requiredDocs) {
      if (!files[doc.key]) {
        Alert.alert("Required Document", `Please upload: ${doc.label}`)
        return
      }
    }

    setPreview({ ...form })
  }, [form, files, isEditing])

  //  Submit 
  const handleSubmit = useCallback(async () => {
    if (!preview) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const formattedInsurance = form.hasInsurance ? form.hasInsurance.toUpperCase() : "NO"
      const formattedTracker = form.hasTracker ? form.hasTracker.toUpperCase() : "NO"
      const payload: OfflineSubmissionPayload = {
        submissionType: "direct_sale",
        salesAgentName: user?.name || "internal-staff",
        customerType: form.customerType,
        customerFullName: form.customerFullName,
        customerIdNumber: form.customerIdNumber,
        customerPhone: form.customerPhone,
        kraPin: form.kraPin,
        customerLocation: form.customerLocation,
        bikeModel: form.bikeModel,
        bikeRegistrationNumber: form.bikeRegistrationNumber,
        chassisNumber: form.chassisNumber,
        paymentType: form.paymentType,
        financeDetails: form.financeDetails,
        bikeColor: form.bikeColor,
        hasInsurance: formattedInsurance === "NO" ? "NO" : formattedInsurance,
        hasTracker: formattedTracker === "NO" ? "NO" : formattedTracker,
        referralName: form.referralName,
        deploymentName: form.deploymentName,
        invoiceNumber: form.invoiceNumber,
        saleDate: form.saleDate,
        quantity: form.quantity,
      }

      for (const field of DOCUMENT_FIELDS) {
        const file = files[field.key]
        if (file && file.uri) {
          payload[field.key] = {
            uri: file.uri,
            name: file.name || `${field.key}.jpg`,
            type: file.type || "image/jpeg",
          }
        }
      }

      if (isEditing && editId) {
        const editForm = new FormData()
        for (const [key, value] of Object.entries(payload)) {
          if (value === null || value === undefined) continue
          if (typeof value === "object") editForm.append(key, value as any)
          else editForm.append(key, value)
        }
        editForm.append("editedBy", user?.name || "sales-record.mobile")
        await api.patch(`/sales-record/${editId}`, editForm)
        setSuccess("Sale updated successfully. Matching and commission/referral checks were re-run.")
        setPreview(null)
        return
      }

      const localDocuments = {
        invoice_photo_url: typeof payload.invoicePhoto === "object" && payload.invoicePhoto ? payload.invoicePhoto.uri : null,
        agreement_photo_url: typeof payload.salesAgreementPhoto === "object" && payload.salesAgreementPhoto ? payload.salesAgreementPhoto.uri : null,
        id_doc_url: typeof payload.idDocument === "object" && payload.idDocument ? payload.idDocument.uri : null,
        kra_doc_url: typeof payload.kraDocument === "object" && payload.kraDocument ? payload.kraDocument.uri : null,
        bike_photo_url: typeof payload.bikePhoto === "object" && payload.bikePhoto ? payload.bikePhoto.uri : null,
        chassis_photo_url: typeof payload.chassisPhoto === "object" && payload.chassisPhoto ? payload.chassisPhoto.uri : null,
      }

      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const queuedAt = new Date().toISOString()
      const pendingRecord = buildPendingSalesRecord(localId, {
        submissionType: "direct_sale",
        salesAgentName: user?.name || "internal-staff",
        customerFullName: form.customerFullName,
        customerLocation: form.customerLocation,
        bikeModel: form.bikeModel,
        invoiceNumber: form.invoiceNumber,
        saleDate: form.saleDate,
        quantity: form.quantity,
        paymentType: form.paymentType,
        localDocuments,
      }, queuedAt)
      pendingRecord.payload_json = JSON.stringify(payload)
      await insertPendingSalesRecord(pendingRecord)
      void runSyncWorker().catch(() => undefined)

      setSuccess("Sale saved on this device and queued for sync. It will receive the server conversion code after synchronization.")
      setPreview(null)
      setForm(INITIAL_FORM)
      setFiles({})
    } catch (err: any) {
      setError(err.message || "Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }, [preview, form, files, user, editId, isEditing])

  //  Render file picker button 
  const renderFilePicker = (field: (typeof DOCUMENT_FIELDS)[number]) => {
    const file = files[field.key]
    const existingUrl = existingDocuments[field.key]
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
        ) : existingUrl ? (
          <View style={s.existingFile}>
            <View style={s.existingFileCopy}>
              <Text style={s.existingFileTitle}>Existing document retained</Text>
              <Text style={s.existingFileMeta} numberOfLines={1}>{existingUrl}</Text>
            </View>
            <View style={s.existingFileActions}>
              <TouchableOpacity onPress={() => Linking.openURL(existingUrl)} style={s.viewFileBtn}>
                <Text style={s.viewFileText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddFile(field.key)} style={s.replaceFileBtn}>
                <Text style={s.replaceFileText}>Replace</Text>
              </TouchableOpacity>
            </View>
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
        <Text style={s.headerTitle}>{isEditing ? "Edit Sale Record" : "Sales Record"}</Text>
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
            
            <View style={s.fieldGroup}>
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
                listMode="MODAL"
                modalProps={{ animationType: "slide" }}
                modalTitle="Select Make / Model"
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

            <View style={s.fieldGroup}>
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
                listMode="MODAL"
                modalProps={{ animationType: "slide" }}
                modalTitle="Select Bike Color"
              />
            </View>

            <View style={s.fieldGroup}>
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
                listMode="MODAL"
                modalProps={{ animationType: "slide" }}
                modalTitle="Select Insurance"
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
                  Alert.alert("Confirm", isEditing ? "Save these changes and re-run sale matching?" : "Are you sure you want to submit this sale record?", [
                    { text: "Cancel", style: "cancel" },
                    { text: isEditing ? "Save Changes" : "Confirm & Submit", onPress: handleSubmit },
                  ])
                }}
                disabled={submitting}
                style={[s.confirmBtn, submitting && { opacity: 0.5 }]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.confirmBtnText}>{isEditing ? "Save Changes" : "Confirm & Submit"}</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={s.previewNote}>
              {form.customerIdNumber
                ? "If an open lead matches this customer ID, it will be converted to a freelancer lead sale with commission."
                : "This is a direct sale — no commission will be generated."}
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  )
}

//  Styles 
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