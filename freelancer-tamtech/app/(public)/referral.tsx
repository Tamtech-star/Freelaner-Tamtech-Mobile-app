import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { submitReferral } from "../../src/api/referrals";
import { COLORS, SHADOWS } from "../../src/constants/config";

export default function ReferralScreen() {
  const [referrerName, setReferrerName] = useState("");
  const [referrerPhone, setReferrerPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerIdNumber, setCustomerIdNumber] = useState("");
  
  // Replaced bikeModel with paymentMode
  const [paymentMode, setPaymentMode] = useState("");
  
  // Added Quantity state (defaults to "1")
  const [quantity, setQuantity] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incrementQuantity = () => {
    const currentQty = parseInt(quantity || "0", 10);
    setQuantity(String(currentQty + 1));
  };

  const decrementQuantity = () => {
    const currentQty = parseInt(quantity || "0", 10);
    if (currentQty > 1) {
      setQuantity(String(currentQty - 1));
    }
  };

  const handleSubmit = async () => {
    if (!referrerName.trim() || !referrerPhone.trim()) {
      Alert.alert("Missing Fields", "Your name and phone number are required.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !customerIdNumber.trim()) {
      Alert.alert("Missing Fields", "Customer name, phone, and ID number are required.");
      return;
    }
    if (!paymentMode) {
      Alert.alert("Missing Fields", "Please select a payment mode.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitReferral({
        referrer_name: referrerName.trim(),
        referrer_phone: referrerPhone.trim(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_id_number: customerIdNumber.trim() || undefined,
        payment_mode: paymentMode, // Added to payload
        quantity: parseInt(quantity || "1", 10), // Added to payload
        referral_code: referralCode.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Referral Submitted!</Text>
          <Text style={styles.successSubtitle}>
            You'll be notified when this lead converts to a sale.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSuccess(false);
              setReferrerName("");
              setReferrerPhone("");
              setReferralCode("");
              setCustomerName("");
              setCustomerPhone("");
              setCustomerIdNumber("");
              setPaymentMode("");
              setQuantity("1");
            }}
            style={styles.submitBtn}
          >
            <Text style={styles.submitBtnText}>Submit Another Referral</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Submit a Referral</Text>
        <Text style={styles.subtitle}>
          Refer a customer and earn commission when they make a purchase
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section 1: Referrer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Information</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Your Name *</Text>
            <TextInput
              style={styles.input}
              value={referrerName}
              onChangeText={setReferrerName}
              placeholder="Your full name"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Your Phone *</Text>
            <TextInput
              style={styles.input}
              value={referrerPhone}
              onChangeText={setReferrerPhone}
              placeholder="Your phone number"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Referral Code </Text>
            <TextInput
              style={styles.input}
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="Enter referral code if you have one"
              placeholderTextColor={COLORS.placeholder}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Section 2: Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Customer's full name"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Customer Phone *</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Customer's phone number"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Customer ID Number * </Text>
            <TextInput
              style={styles.input}
              value={customerIdNumber}
              onChangeText={setCustomerIdNumber}
              placeholder="Customer's national ID"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>
          
          {/* New Payment Mode Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Payment Mode Interested *</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={paymentMode}
                onValueChange={(v) => setPaymentMode(v)}
                style={styles.picker}
              >
                <Picker.Item label="Select payment mode" value="" />
                <Picker.Item label="Loan" value="Loan" />
                <Picker.Item label="Cash" value="Cash" />
              </Picker>
            </View>
          </View>

          {/* New Quantity Field with Stepper */}
          <View style={styles.field}>
            <Text style={styles.label}>Quantity *</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={decrementQuantity}
              >
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.stepperInput}
                value={quantity}
                onChangeText={(text) => {
                  // Only allow numeric input
                  const numericText = text.replace(/[^0-9]/g, "");
                  setQuantity(numericText);
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={incrementQuantity}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Referral</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    color: COLORS.info,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 20,
  },
  section: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.body,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.heading,
    backgroundColor: COLORS.inputBg,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.inputBg,
  },
  picker: {
    height: 48,
  },
  
  // New Styles for the Quantity Stepper
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperBtn: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 24,
    color: COLORS.heading,
    fontWeight: "500",
  },
  stepperInput: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    height: 44,
    minWidth: 60,
    marginHorizontal: 12,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.heading,
    backgroundColor: COLORS.inputBg,
  },

  errorBanner: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: COLORS.gradientStart,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  successWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 32,
    color: "#059669",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: COLORS.info,
    fontWeight: "600",
  },
});