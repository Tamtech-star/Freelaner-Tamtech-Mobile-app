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
  Modal,
} from "react-native"
import { Link, router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { Eye, EyeOff } from "lucide-react-native"
import { useAuthStore } from "../src/store/authStore"
import { forgotPassword } from "../src/api/auth"
import { COLORS, SHADOWS } from "../src/constants/config"
import { useAppTheme } from "../src/theme/theme"

export default function LoginScreen() {
  const { colors } = useAppTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotDone, setForgotDone] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter both email and password.")
      return
    }

    const result = await login(email.trim(), password.trim())

    if (result.success) {
      const { role } = useAuthStore.getState()
      if (role === "admin") {
        router.replace("/(admin)")
      } else if (role === "sales_agent") {
        router.replace("/(sales-record)")
      } else if (role === "freelancer") {
        router.replace("/(freelancer)")
      }
    } else {
      Alert.alert("Login Failed", result.error || "Invalid credentials.")
    }
  }

  // ── Forgot Password ──
  const openForgotPassword = () => {
    setForgotEmail(email)
    setForgotDone(false)
    setForgotError(null)
    setForgotOpen(true)
  }

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email.")
      return
    }
    setForgotLoading(true)
    setForgotError(null)
    try {
      await forgotPassword(forgotEmail.trim())
      setForgotDone(true)
    } catch (err: any) {
      setForgotError(err.message || "Failed to send login code. Please try again.")
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgot = () => {
    setForgotOpen(false)
    setForgotDone(false)
    setForgotError(null)
  }

  // Dev quick-access: bypass login to preview screens
  const devNavigate = (screen: string) => {
    // Set a fake auth state so layouts don't redirect away
    useAuthStore.setState({
      token: "dev-token",
      role: screen === "sales" ? "sales_agent" : screen === "admin" ? "admin" : "freelancer",
      user: { id: "dev", email: "dev@test.com", name: screen === "sales" ? "Sales Agent" : screen === "admin" ? "Admin" : "Musa Simon", code: screen === "freelancer" ? "MUSA.SIMON4289" : undefined },
      isAuthenticated: true,
      isLoading: false,
    })
    if (screen === "sales") {
      router.replace("/(sales-record)")
    } else     if (screen === "admin") {
      router.replace("/(admin)")
    } else if (screen === "freelancer") {
      router.replace("/(freelancer)")
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.headerSection}>
          <Text style={styles.brandTag}>TAMTECH TOOLS</Text>
          <Text style={styles.brandTitle}>Freelancer Portal</Text>
          <Text style={styles.brandSubtitle}>
            Sign in to access your metrics
          </Text>
        </View>

        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.heading }]}>Welcome Back</Text>
          <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
            Enter your credentials to continue
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.heading, backgroundColor: colors.input, borderColor: colors.border }]}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordInputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.heading }]}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityButton}
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                accessibilityHint={showPassword ? "Hides the password text" : "Shows the password text"}
              >
                {showPassword ? <EyeOff size={20} color={COLORS.muted} /> : <Eye size={20} color={COLORS.muted} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={openForgotPassword} style={styles.forgotLink}>
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Dev Quick Access - Remove this section before production */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>Dev Quick Access</Text>
            <Text style={styles.devSubtitle}>Skip login to preview screens</Text>
            <View style={styles.devRow}>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => devNavigate("admin")}
              >
                <Text style={styles.devButtonText}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => devNavigate("sales")}
              >
                <Text style={styles.devButtonText}>Sales Record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => devNavigate("freelancer")}
              >
                <Text style={styles.devButtonText}>Freelancer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Public links */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/(public)/register" style={styles.footerLink}>
            Sign Up to Become a Freelancer
          </Link>
          <Text style={[styles.footerText, { marginTop: 16 }]}>Not an agent or freelancer?</Text>
          <Link href="/(public)/referral" style={styles.footerLink}>
            Submit a Referral Without Login
          </Link>
        </View>
      </ScrollView>

      <Modal visible={forgotOpen} transparent animationType="fade" onRequestClose={closeForgot}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {forgotDone ? (
              <>
                <View style={styles.modalCheck}><Text style={styles.modalCheckText}>✓</Text></View>
                <Text style={[styles.modalTitle, { color: colors.heading }]}>Kindly check your email</Text>
                <Text style={[styles.modalBody, { color: colors.muted }]}>
                  We've sent your login code reminder to {forgotEmail.trim()}.
                </Text>
                <TouchableOpacity onPress={closeForgot} style={styles.modalPrimaryBtn}>
                  <Text style={styles.modalPrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: colors.heading }]}>Forgot Password</Text>
                <Text style={[styles.modalBody, { color: colors.muted }]}>
                  Enter your registered email and we'll send you a reminder with your login code.
                </Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.heading, backgroundColor: colors.input, borderColor: colors.border }]}
                  placeholder="Your registered email"
                  placeholderTextColor={COLORS.placeholder}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {forgotError && <Text style={styles.modalError}>{forgotError}</Text>}
                <TouchableOpacity onPress={handleForgotSubmit} disabled={forgotLoading} style={styles.modalPrimaryBtn}>
                  {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryBtnText}>Send Login Code</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={closeForgot} style={styles.modalCancel}>
                  <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandTag: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    color: COLORS.gradientStart,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.gradientStart,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.heading,
    backgroundColor: COLORS.inputBg,
  },
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.heading,
  },
  passwordVisibilityButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonWrapper: {
    marginTop: 8,
  },
  gradientButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
   fontWeight: "700",
  },
  devSection: {
    marginTop: 24,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde047",
    borderRadius: 12,
    padding: 16,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#713f12",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  devSubtitle: {
    fontSize: 12,
    color: "#a16207",
    marginBottom: 12,
  },
  devRow: {
    flexDirection: "row",
    gap: 10,
  },
  devButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  devButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.gradientStart,
    fontWeight: "600",
  },
  forgotLink: { alignSelf: "center", marginTop: 16 },
  forgotLinkText: { fontSize: 13, fontWeight: "600", color: COLORS.gradientStart },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 420, borderRadius: 16, padding: 24, borderWidth: 1, ...SHADOWS.card },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.heading, marginBottom: 6, textAlign: "center" },
  modalBody: { fontSize: 13, color: COLORS.muted, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  modalInput: { borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.heading, backgroundColor: COLORS.inputBg, marginBottom: 12 },
  modalError: { fontSize: 12, fontWeight: "600", color: "#991b1b", textAlign: "center", marginBottom: 10 },
  modalPrimaryBtn: { backgroundColor: COLORS.gradientStart, paddingVertical: 13, borderRadius: 8, alignItems: "center", marginTop: 4 },
  modalPrimaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalCancel: { alignItems: "center", marginTop: 12 },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  modalCheck: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  modalCheckText: { fontSize: 26, color: "#059669", fontWeight: "700" },
})
