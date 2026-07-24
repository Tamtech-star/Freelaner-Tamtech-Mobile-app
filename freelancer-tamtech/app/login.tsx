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
import { Link, router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { useAuthStore } from "../src/store/authStore"
import { COLORS, SHADOWS } from "../src/constants/config"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { login, isLoading } = useAuthStore()

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter both email and password.")
      return
    }

    const result = await login(email.trim(), password.trim())

    if (result.success) {
      const { role } = useAuthStore.getState()
      if (role === "sales_agent") {
        router.replace("/(sales-record)")
      } else if (role === "freelancer") {
        router.replace("/(freelancer)")
      }
    } else {
      Alert.alert("Login Failed", result.error || "Invalid credentials.")
    }
  }

  // Dev quick-access: bypass login to preview screens
  const devNavigate = (screen: string) => {
    // Set a fake auth state so layouts don't redirect away
    useAuthStore.setState({
      token: "dev-token",
      role: screen === "sales" ? "sales_agent" : "freelancer",
      user: { id: "dev", email: "dev@test.com", name: screen === "sales" ? "Sales Agent" : "Musa Simon" },
      isAuthenticated: true,
      isLoading: false,
    })
    if (screen === "sales") {
      router.replace("/(sales-record)")
    } else if (screen === "freelancer") {
      router.replace("/(freelancer)")
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.headerSection}>
          <Text style={styles.brandTag}>TAMTECH TOOLS</Text>
          <Text style={styles.brandTitle}>Freelancer Portal</Text>
          <Text style={styles.brandSubtitle}>
            Sign in as a sales agent or freelancer
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>
            Enter your credentials to continue
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
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
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
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
        </View>

        {/* Dev Quick Access - Remove this section before production */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>Dev Quick Access</Text>
            <Text style={styles.devSubtitle}>Skip login to preview screens</Text>
            <View style={styles.devRow}>
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

        {/* Public referral link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Not an agent or freelancer?</Text>
          <Link href="/(public)/referral" style={styles.footerLink}>
            Submit a Referral Without Login
          </Link>
        </View>
      </ScrollView>
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
    color: COLORS.heading,
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
})
