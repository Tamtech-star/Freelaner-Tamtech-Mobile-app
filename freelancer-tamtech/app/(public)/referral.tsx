import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { router } from "expo-router"
import { COLORS } from "../../src/constants/config"

export default function ReferralScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>{"<"} Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Submit a Referral</Text>
        <Text style={styles.subtitle}>
          Refer a customer and earn commission when they purchase
        </Text>
        <Text style={styles.placeholder}>
          Referral form coming in Phase 6
        </Text>
      </View>
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
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    color: COLORS.info,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.heading,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  placeholder: {
    fontSize: 14,
    color: COLORS.light,
    fontStyle: "italic",
  },
})
