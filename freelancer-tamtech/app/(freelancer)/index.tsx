import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { useAuthStore } from "../../src/store/authStore"
import { COLORS, SHADOWS } from "../../src/constants/config"

export default function FreelancerDashboard() {
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Text style={styles.userName}>{user?.name || "Freelancer"}</Text>
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>Loading...</Text>
        </View>
      </View>

      {/* Navigation Bar */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navActive}>
          <Text style={styles.navActiveText}>Freelancer Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={styles.buttonWrapper}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.gradientButtonText}>+ New Lead</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Referral Code Display */}
      <View style={styles.refCodeBox}>
        <Text style={styles.refCodeText}>Loading...</Text>
      </View>

      {/* Stat Cards */}
      <Text style={styles.sectionTitle}>Your Performance</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Leads</Text>
          <Text style={styles.statValue}>0</Text>
          <TouchableOpacity>
            <Text style={styles.statLink}>View details →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Processing</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>0</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>KES 0</Text>
        </View>
      </View>

      {/* Recent Leads */}
      <Text style={styles.sectionTitle}>Recent Leads</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No leads submitted yet.</Text>
        <Text style={styles.emptySubtext}>Tap "+ New Lead" to get started</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.heading,
    marginRight: 12,
  },
  codeBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  codeBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  navActive: {
    flex: 1,
    backgroundColor: COLORS.info,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  navActiveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  buttonWrapper: {
    flex: 1,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  gradientButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
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
  refCodeText: {
    fontSize: 14,
    color: COLORS.body,
    fontFamily: "monospace",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 20,
    minHeight: 100,
    justifyContent: "space-between",
    ...SHADOWS.card,
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
  statLink: {
    fontSize: 12,
    color: COLORS.light,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    ...SHADOWS.cardSm,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.light,
  },
  logoutBtn: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 13,
  },
})
