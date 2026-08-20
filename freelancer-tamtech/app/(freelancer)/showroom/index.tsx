import { useEffect } from "react"
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { Bike, ChevronLeft, ChevronRight, Landmark } from "lucide-react-native"
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

const { width } = Dimensions.get("window")

const EXPERIENCES = [
  {
    id: "bike",
    eyebrow: "INTERACTIVE STUDIO",
    title: "Know Your Bike",
    description: "Explore each machine through cinematic motion and tap into the details that matter.",
    route: "/(freelancer)/showroom/know-your-bike" as const,
    accent: "#37E6FF",
    icon: Bike,
    gradient: ["#07191D", "#101317", "#020303"] as const,
  },
  {
    id: "finance",
    eyebrow: "OWNERSHIP, EXPLAINED",
    title: "How to Purchase",
    description: "Compare flexible ownership paths and understand what it takes to start your journey.",
    route: "/(freelancer)/showroom/financing" as const,
    accent: "#B7FF4A",
    icon: Landmark,
    gradient: ["#151A0B", "#11140F", "#020302"] as const,
  },
]

function ShowroomCard({ item, index }: { item: (typeof EXPERIENCES)[number]; index: number }) {
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 3200 + index * 500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [index, pulse])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.16, 0.52]),
    transform: [
      { translateX: interpolate(pulse.value, [0, 1], [-width * 0.5, width * 0.65]) },
      { rotate: "14deg" },
    ],
  }))

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
  }))

  const Icon = item.icon

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => router.push(item.route)}
      style={({ pressed }) => [styles.cardShell, pressed && styles.cardPressed]}
    >
      <LinearGradient colors={item.gradient} style={styles.card}>
        <Animated.View
          pointerEvents="none"
          style={[styles.sweep, { backgroundColor: item.accent }, glowStyle]}
        />
        <View style={styles.cardTopRow}>
          <Text style={[styles.eyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
          <Animated.View style={[styles.iconPlate, { borderColor: `${item.accent}66` }, iconStyle]}>
            <Icon size={28} color={item.accent} strokeWidth={1.7} />
          </Animated.View>
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>ENTER EXPERIENCE</Text>
          <ChevronRight size={18} color={item.accent} />
        </View>
      </LinearGradient>
    </Pressable>
  )
}

export default function ShowroomHub() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={23} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>TAMTECH / VIRTUAL SHOWROOM</Text>
            <Text style={styles.title}>Choose your experience.</Text>
            <Text style={styles.subtitle}>
              Get closer to the machine, then find the ownership path built around you.
            </Text>
          </View>
        </View>

        <View style={styles.cards}>
          {EXPERIENCES.map((item, index) => (
            <ShowroomCard key={item.id} item={item} index={index} />
          ))}
        </View>

        <View style={styles.footerLine} />
        <Text style={styles.footerText}>BUILT FOR THE ROAD AHEAD</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000000" },
  container: { flex: 1, backgroundColor: "#000000" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 38 },
  header: { marginBottom: 28 },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#0A0A0A",
    marginBottom: 28,
  },
  headerCopy: { maxWidth: 560 },
  kicker: { color: "#37E6FF", fontSize: 11, fontWeight: "800", letterSpacing: 1.8, marginBottom: 12 },
  title: { color: "#FFFFFF", fontSize: 38, lineHeight: 43, fontWeight: "800", letterSpacing: 0 },
  subtitle: { color: "#8D9298", fontSize: 15, lineHeight: 23, marginTop: 12, maxWidth: 500 },
  cards: { gap: 18 },
  cardShell: {
    minHeight: 278,
    borderWidth: 1,
    borderColor: "#2C3033",
    backgroundColor: "#080909",
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.992 }] },
  card: { flex: 1, minHeight: 278, padding: 24, justifyContent: "space-between", overflow: "hidden" },
  sweep: { position: "absolute", top: -110, width: 82, height: 510, shadowColor: "#FFFFFF", shadowOpacity: 0.3, shadowRadius: 22 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  iconPlate: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "#050606CC",
  },
  cardCopy: { paddingTop: 38, paddingBottom: 26, maxWidth: 450 },
  cardTitle: { color: "#FFFFFF", fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: 0 },
  cardDescription: { color: "#A3A7AC", fontSize: 14, lineHeight: 22, marginTop: 10, maxWidth: 410 },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  footerLine: { height: 1, backgroundColor: "#202020", marginTop: 30 },
  footerText: { color: "#52575B", fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: 16 },
})
