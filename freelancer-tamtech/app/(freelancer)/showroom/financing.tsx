import { useEffect, useState } from "react"
import {
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { ChevronLeft, ChevronDown, Check, Percent, WalletCards } from "lucide-react-native"
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type FinancingOption = {
  id: "hire-purchase" | "cash-loan"
  eyebrow: string
  title: string
  summary: string
  accent: string
  icon: typeof WalletCards
  details: Array<{ label: string; value: string }>
}

const OPTIONS: FinancingOption[] = [
  {
    id: "hire-purchase",
    eyebrow: "FLEXIBLE OWNERSHIP",
    title: "Hire Purchase",
    summary: "Ride now, spread the cost with a structured path to ownership.",
    accent: "#37E6FF",
    icon: WalletCards,
    details: [
      { label: "Typical deposit", value: "From 20%" },
      { label: "Repayment period", value: "12–36 months" },
      { label: "Indicative interest", value: "From 12% p.a." },
      { label: "Best for", value: "Predictable monthly planning" },
    ],
  },
  {
    id: "cash-loan",
    eyebrow: "QUICKER START",
    title: "Cash Loan",
    summary: "Secure the funds you need and take a direct route to your new bike.",
    accent: "#B7FF4A",
    icon: Percent,
    details: [
      { label: "Deposit", value: "Flexible" },
      { label: "Repayment period", value: "6–24 months" },
      { label: "Indicative interest", value: "Subject to lender review" },
      { label: "Best for", value: "Fast, adaptable financing" },
    ],
  },
]

function FinancingCard({ option, expanded, onPress }: { option: FinancingOption; expanded: boolean; onPress: () => void }) {
  const progress = useSharedValue(expanded ? 1 : 0)
  const Icon = option.icon

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) })
  }, [expanded, progress])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${option.title} financing option`}
      onPress={onPress}
      style={[styles.optionShell, expanded && { borderColor: `${option.accent}88` }]}
    >
      <LinearGradient
        colors={expanded ? ["#101E21", "#0A1011", "#050606"] : ["#0B0D0D", "#070808"]}
        style={styles.optionCard}
      >
        <View style={styles.optionHeader}>
          <View style={[styles.optionIcon, { borderColor: `${option.accent}66` }]}>
            <Icon size={23} color={option.accent} strokeWidth={1.7} />
          </View>
          <View style={styles.optionHeaderCopy}>
            <Text style={[styles.optionEyebrow, { color: option.accent }]}>{option.eyebrow}</Text>
            <Text style={styles.optionTitle}>{option.title}</Text>
          </View>
          <Animated.View style={iconStyle}>
            <ChevronDown size={21} color="#A9B0B2" />
          </Animated.View>
        </View>
        <Text style={styles.optionSummary}>{option.summary}</Text>

        {expanded ? (
          <View style={styles.details}>
            {option.details.map((detail) => (
              <View key={detail.label} style={styles.detailRow}>
                <View style={styles.detailLabelWrap}>
                  <Check size={14} color={option.accent} />
                  <Text style={styles.detailLabel}>{detail.label}</Text>
                </View>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
            <View style={[styles.applyBox, { borderColor: `${option.accent}55` }]}>
              <Text style={styles.applyText}>Speak to our team to confirm your personalised rate.</Text>
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  )
}

export default function FinancingScreen() {
  const [expanded, setExpanded] = useState<FinancingOption["id"] | null>("hire-purchase")

  const toggle = (id: FinancingOption["id"]) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((current) => (current === id ? null : id))
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={23} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topBarLabel}>HOW TO PURCHASE</Text>
          <View style={styles.topBarRule} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>OWNERSHIP, ON YOUR TERMS</Text>
          <Text style={styles.title}>Make the next move.</Text>
          <Text style={styles.subtitle}>
            Choose a route that fits the way you want to ride. Expand an option to see the essentials.
          </Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <FinancingCard key={option.id} option={option} expanded={expanded === option.id} onPress={() => toggle(option.id)} />
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>A considered purchase</Text>
          <Text style={styles.noteBody}>
            Rates and deposits are indicative. Your final offer depends on the lender assessment and selected motorcycle.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000000" },
  container: { flex: 1, backgroundColor: "#000000" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 13 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#292929", backgroundColor: "#090909" },
  topBarLabel: { color: "#A7ADB0", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  topBarRule: { height: 1, flex: 1, backgroundColor: "#222526" },
  hero: { paddingTop: 54, paddingBottom: 34 },
  eyebrow: { color: "#B7FF4A", fontSize: 10, fontWeight: "900", letterSpacing: 1.8, marginBottom: 12 },
  title: { color: "#FFFFFF", fontSize: 40, lineHeight: 44, fontWeight: "900" },
  subtitle: { color: "#898F92", fontSize: 15, lineHeight: 23, marginTop: 13, maxWidth: 500 },
  options: { gap: 16 },
  optionShell: { borderWidth: 1, borderColor: "#292D2E", backgroundColor: "#070808" },
  optionCard: { padding: 22 },
  optionHeader: { flexDirection: "row", alignItems: "center" },
  optionIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, backgroundColor: "#020303" },
  optionHeaderCopy: { flex: 1, marginLeft: 14 },
  optionEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  optionTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 3 },
  optionSummary: { color: "#9CA3A5", fontSize: 14, lineHeight: 21, marginTop: 20, paddingRight: 18 },
  details: { marginTop: 23, borderTopWidth: 1, borderTopColor: "#2A3132", paddingTop: 17 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1E2425" },
  detailLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { color: "#858D8F", fontSize: 12 },
  detailValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", textAlign: "right", maxWidth: "48%" },
  applyBox: { borderWidth: 1, marginTop: 18, padding: 13, backgroundColor: "#050707" },
  applyText: { color: "#AEB5B6", fontSize: 12, lineHeight: 18 },
  note: { borderLeftWidth: 2, borderLeftColor: "#37E6FF", paddingLeft: 15, marginTop: 38 },
  noteTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  noteBody: { color: "#737B7E", fontSize: 12, lineHeight: 19, marginTop: 5 },
})
