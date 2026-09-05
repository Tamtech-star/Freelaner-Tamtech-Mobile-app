import { useCallback, useEffect, useRef, useState } from "react"
import {
  Image,
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
import { Audio } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { ChevronDown, ChevronLeft, Check, Percent, Volume2, VolumeX, WalletCards, X } from "lucide-react-native"
import { getShowroomAudioEnabled, useShowroomAudioPreference } from "../../../src/showroom/audioPreference"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type FinancingId = "hire-purchase" | "cash-loan"

type FinancingOption = {
  id: FinancingId
  eyebrow: string
  title: string
  summary: string
  accent: string
  icon: typeof WalletCards
  details: Array<{ label: string; value: string }>
  guideIntro: string
  guidePoints: string[]
}

const OPTIONS: FinancingOption[] = [
  {
    id: "hire-purchase",
    eyebrow: "WATU FINANCING",
    title: "Hire Purchase",
    summary: "Ride Green. Save More. Pay daily while you earn.",
    accent: "#37E6FF",
    icon: WalletCards,
    details: [
      { label: "Promo Deposit", value: "KES 15,000 (Was 25k)" },
      { label: "Daily Payment", value: "KES 340" },
      { label: "Duration", value: "18 Months" },
      { label: "Requirements", value: "ID, KRA PIN, 6mo M-PESA" },
    ],
    guideIntro: "Watu Financing makes EV ownership easy. You do NOT need a Driving License or Stage Chairman details to qualify!",
    guidePoints: [
      "Take advantage of the limited KES 15,000 deposit discount.",
      "Pay just KES 340 daily for an 18-month duration.",
      "Requires: Original ID (Borrower & Guarantor) and 3 Reference Contacts."
    ],
  },
  {
    id: "cash-loan",
    eyebrow: "IMMEDIATE OWNERSHIP",
    title: "Cash Purchase",
    summary: "Secure your EV bike immediately with a one-time payment. Zero daily hassle.",
    accent: "#B7FF4A",
    icon: Percent,
    details: [
      { label: "Total Price", value: "KES 130,000" },
      { label: "Daily Payment", value: "None" },
      { label: "Interest", value: "0%" },
      { label: "Best for", value: "Maximum long-term savings" },
    ],
    guideIntro: "Buying in cash is the most cost-effective way to ride. You pay once and own the bike completely with zero daily deductions.",
    guidePoints: [
      "Pay a flat cash price of KES 130,000.",
      "No daily payments, interest rates, or loan durations.",
      "Ride away immediately with 100% ownership."
    ],
  },
]

function FinancingCard({
  option,
  expanded,
  onPress,
}: {
  option: FinancingOption
  expanded: boolean
  onPress: () => void
}) {
  const progress = useSharedValue(expanded ? 1 : 0)
  const Icon = option.icon

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    })
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
              <Text style={styles.applyText}>Speak to our team to confirm your personalised rate.Call 0118 673 848 or whatsaap</Text>
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  )
}

export default function FinancingScreen() {
  const { audioEnabled, audioEnabledRef, setAudioPreference } = useShowroomAudioPreference()
  const [expanded, setExpanded] = useState<FinancingId | null>(null)
  const [guideVisible, setGuideVisible] = useState(false)
  const [guideOption, setGuideOption] = useState<FinancingOption | null>(null)
  const avatarEntrance = useSharedValue(350)
  const avatarOpacity = useSharedValue(0)
  const avatarIdle = useSharedValue(0)
  const bubbleScale = useSharedValue(0)
  const bubbleOpacity = useSharedValue(0)
  const clickSoundRef = useRef<Audio.Sound | null>(null)
  const narrationSoundRef = useRef<Audio.Sound | null>(null)
  const animationTokenRef = useRef(0)

  const stopSound = useCallback(async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    const sound = soundRef.current
    soundRef.current = null
    if (!sound) return
    try {
      await sound.stopAsync()
    } catch {
      // The sound may already have completed.
    }
    try {
      await sound.unloadAsync()
    } catch {
      // Cleanup must remain safe during navigation and unmount.
    }
  }, [])

  const stopGuideAudio = useCallback(async () => {
    await Promise.all([stopSound(clickSoundRef), stopSound(narrationSoundRef)])
  }, [stopSound])

  const playClick = useCallback(async () => {
    await getShowroomAudioEnabled()
    if (!audioEnabledRef.current) return
    await stopSound(clickSoundRef)
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../../assets/sounds/click.wav"),
        { shouldPlay: true, volume: 0.35 },
      )
      clickSoundRef.current = sound
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          clickSoundRef.current = null
          void sound.unloadAsync()
        }
      })
    } catch {
      // The guide remains usable if a device cannot play the click effect.
    }
  }, [stopSound])

  const playNarration = useCallback(async (token: number, option: FinancingOption) => {
    await getShowroomAudioEnabled()
    if (!audioEnabledRef.current) return
    if (token !== animationTokenRef.current) return
    await stopSound(narrationSoundRef)
    if (token !== animationTokenRef.current) return
    try {
      const narrationSource = option.id === "cash-loan"
        ? require("../../../assets/sounds/financing-speech-female.mp3")
        : require("../../../assets/sounds/financing-speech.mp3")
      const { sound } = await Audio.Sound.createAsync(
        narrationSource,
        { shouldPlay: true, volume: 0.8 },
      )
      if (token !== animationTokenRef.current) {
        await sound.unloadAsync()
        return
      }
      narrationSoundRef.current = sound
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          narrationSoundRef.current = null
          void sound.unloadAsync()
        }
      })
    } catch {
      // The speech bubble remains available if narration playback is unavailable.
    }
  }, [stopSound])

  const startGuideMotion = useCallback((token: number, option: FinancingOption) => {
    if (token !== animationTokenRef.current) return
    avatarIdle.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
    bubbleScale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.35)) })
    bubbleOpacity.value = withTiming(1, { duration: 260 })
    void playNarration(token, option)
  }, [avatarIdle, bubbleOpacity, bubbleScale, playNarration])

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [
      { translateX: avatarEntrance.value },
      { translateY: avatarIdle.value },
    ],
  }))

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }))

  const closeGuide = useCallback(() => {
    animationTokenRef.current += 1
    setGuideVisible(false)
    setGuideOption(null)
    avatarIdle.value = withTiming(0, { duration: 220 })
    bubbleScale.value = withTiming(0, { duration: 180 })
    bubbleOpacity.value = withTiming(0, { duration: 180 })
    avatarOpacity.value = withTiming(0, { duration: 260 })
    avatarEntrance.value = withTiming(350, { duration: 300, easing: Easing.in(Easing.cubic) })
    void stopGuideAudio()
  }, [avatarEntrance, avatarIdle, avatarOpacity, bubbleOpacity, bubbleScale, stopGuideAudio])

  const openOption = useCallback((option: FinancingOption) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const token = animationTokenRef.current + 1
    animationTokenRef.current = token
    void stopGuideAudio()
    void playClick()
    setExpanded((current) => (current === option.id ? null : option.id))
    setGuideOption(option)
    setGuideVisible(true)
    avatarIdle.value = withTiming(0, { duration: 120 })
    bubbleScale.value = withTiming(0, { duration: 140 })
    bubbleOpacity.value = withTiming(0, { duration: 140 })
    avatarEntrance.value = 350
    avatarOpacity.value = 0
    avatarOpacity.value = withTiming(1, { duration: 260 })
    avatarEntrance.value = withTiming(0, { duration: 760, easing: Easing.out(Easing.cubic) })
    setTimeout(() => startGuideMotion(token, option), 780)
  }, [avatarEntrance, avatarIdle, avatarOpacity, bubbleOpacity, bubbleScale, playClick, startGuideMotion, stopGuideAudio])

  const toggle = useCallback((option: FinancingOption) => {
    if (expanded === option.id) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setExpanded(null)
      closeGuide()
      return
    }
    openOption(option)
  }, [closeGuide, expanded, openOption])

  const toggleAudio = useCallback(() => {
    const enabled = !audioEnabledRef.current
    void setAudioPreference(enabled)
    if (!enabled) void stopGuideAudio()
  }, [audioEnabledRef, setAudioPreference, stopGuideAudio])

  useEffect(() => {
    if (!audioEnabled) void stopGuideAudio()
  }, [audioEnabled, stopGuideAudio])

  useEffect(() => () => {
    animationTokenRef.current += 1
    void stopGuideAudio()
  }, [stopGuideAudio])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { closeGuide(); router.back() }} style={styles.backButton}>
              <ChevronLeft size={23} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.topBarLabel}>HOW TO PURCHASE</Text>
            <View style={styles.topBarRule} />
            <Pressable accessibilityRole="button" accessibilityLabel={audioEnabled ? "Mute showroom audio" : "Unmute showroom audio"} onPress={toggleAudio} style={styles.audioButton}>
              {audioEnabled ? <Volume2 size={18} color="#FFFFFF" /> : <VolumeX size={18} color="#8D9298" />}
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>OWNERSHIP, ON YOUR TERMS</Text>
            <Text style={styles.title}>Make the next move.</Text>
            <Text style={styles.subtitle}>Choose a route that fits the way you want to ride. Your guide will walk you through the essentials.</Text>
          </View>

          <View style={styles.options}>
            {OPTIONS.map((option) => (
              <FinancingCard key={option.id} option={option} expanded={expanded === option.id} onPress={() => toggle(option)} />
            ))}
          </View>

          <View style={styles.note}>
            <Text style={styles.noteTitle}>A considered purchase</Text>
            <Text style={styles.noteBody}>Rates and deposits are indicative. Your final offer depends on the lender assessment and selected motorcycle.</Text>
          </View>
        </ScrollView>

        {guideVisible && guideOption ? (
          <View pointerEvents="box-none" style={styles.guideLayer}>
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={styles.guideScrim} pointerEvents="none" />
            <Animated.View style={[styles.speechBubble, bubbleStyle]}>
              <View style={[styles.speechAccent, { backgroundColor: guideOption.accent }]} />
              <View style={styles.speechHeader}>
                <Text style={[styles.speechEyebrow, { color: guideOption.accent }]}>YOUR GUIDE SAYS</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close financing guide" onPress={closeGuide} style={styles.speechClose}>
                  <X size={16} color="#FFFFFF" />
                </Pressable>
              </View>
              <Text style={styles.speechIntro}>{guideOption.guideIntro}</Text>
              <View style={styles.speechPoints}>
                {guideOption.guidePoints.map((point) => (
                  <View key={point} style={styles.speechPointRow}>
                    <View style={[styles.speechPoint, { backgroundColor: guideOption.accent }]} />
                    <Text style={styles.speechPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
            <Animated.View style={[styles.avatarWrap, avatarStyle]} pointerEvents="none">
              <Image
                source={guideOption.id === "cash-loan"
                  ? require("../../../assets/images/guide/guide-pointing-female.png")
                  : require("../../../assets/images/guide/guide-pointing.png")}
                style={styles.avatar}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000000" },
  screen: { flex: 1, backgroundColor: "#000000" },
  container: { flex: 1, backgroundColor: "#000000" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 13 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#292929", backgroundColor: "#090909" },
  audioButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#292929", backgroundColor: "#090909" },
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
  guideLayer: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  guideScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000055" },
  avatarWrap: { position: "absolute", right: -26, bottom: 10, width: 205, height: 285, zIndex: 12, alignItems: "center", justifyContent: "flex-end" },
  avatar: { width: "100%", height: "100%" },
  speechBubble: { position: "absolute", right: 156, bottom: 178, width: 220, zIndex: 13, padding: 16, paddingLeft: 20, backgroundColor: "#121A1BF5", borderWidth: 1, borderColor: "#3A5558", shadowColor: "#000000", shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
  speechAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  speechHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  speechEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  speechClose: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#354244" },
  speechIntro: { color: "#E3E8E8", fontSize: 12, lineHeight: 18, marginTop: 10 },
  speechPoints: { gap: 8, marginTop: 12 },
  speechPointRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  speechPoint: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  speechPointText: { flex: 1, color: "#AAB5B6", fontSize: 11, lineHeight: 16 },
})
