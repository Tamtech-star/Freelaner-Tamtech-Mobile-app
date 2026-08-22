import { useCallback, useEffect, useRef } from "react"
import {
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { router } from "expo-router"
import { ArrowRight, MessageCircle } from "lucide-react-native"
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated"

export default function Index() {
  const assembleProgress = useSharedValue(0)
  const contentProgress = useSharedValue(0)
  const navigationStarted = useRef(false)

  useEffect(() => {
    assembleProgress.value = withSpring(1, {
      damping: 17,
      stiffness: 105,
      mass: 0.9,
    })
    contentProgress.value = withDelay(650, withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    }))
  }, [assembleProgress, contentProgress])

  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(assembleProgress.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(assembleProgress.value, [0, 1], [-400, 0]) }],
  }))

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(assembleProgress.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(assembleProgress.value, [0, 1], [400, 0]) }],
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(contentProgress.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(contentProgress.value, [0, 1], [18, 0]) }],
  }))

  const finishLogin = useCallback(() => {
    router.push("/login")
  }, [])

  const handleLogin = useCallback(() => {
    if (navigationStarted.current) return
    navigationStarted.current = true
    contentProgress.value = withTiming(0, { duration: 240 })
    assembleProgress.value = withTiming(0, {
      duration: 600,
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(finishLogin)()
    })
  }, [assembleProgress, contentProgress, finishLogin])

  const openWhatsApp = useCallback(() => {
    void Linking.openURL("whatsapp://send?phone=254118673848")
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topLine}>
            <Text style={styles.topLabel}>TAMTECH TOOLS LIMITED</Text>
            <View style={styles.topDot} />
            <Text style={styles.topMeta}>ELECTRIC MOBILITY</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.logoLockup}>
              <Animated.View style={[styles.markWrap, markStyle]}>
                <Image source={require("../assets/images/logo-mark.jpg")} style={styles.logoMark} resizeMode="contain" />
              </Animated.View>
              <Animated.View style={[styles.wordmarkWrap, wordmarkStyle]}>
                <Image source={require("../assets/images/logo-text.png")} style={styles.logoText} resizeMode="contain" />
              </Animated.View>
            </View>

            <Animated.View style={[styles.messageBlock, contentStyle]}>
              <Text style={styles.kicker}>MOVE WITH PURPOSE</Text>
              <Text style={styles.mission}>Powering a cleaner, more connected way forward.</Text>
              <Text style={styles.supporting}>Built for people, businesses, and the roads that connect us.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Click to Login" onPress={handleLogin} style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed]}>
                <Text style={styles.loginText}>CLICK TO LOGIN</Text>
                <View style={styles.loginIcon}><ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} /></View>
              </Pressable>
            </Animated.View>
          </View>

          <Animated.View style={[styles.lowerContent, contentStyle]}>
            <View style={styles.divider} />
            <View style={styles.contactRow}>
              <View style={styles.contactCopy}>
                <Text style={styles.contactEyebrow}>NEED A HAND?</Text>
                <Text style={styles.contactTitle}>Talk to our team on WhatsApp.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Contact TamTech on WhatsApp" onPress={openWhatsApp} style={({ pressed }) => [styles.whatsappButton, pressed && styles.buttonPressed]}>
                <MessageCircle size={21} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.8} />
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerCompany}>TamTech Tools Limited</Text>
              <Text style={styles.footerLine}>Industrial Area-Dunga Close, Near Car & General Round About</Text>
              <Text style={styles.footerLine}>PO Box 18701-00500, Nairobi - Kenya</Text>
              <View style={styles.footerContactLine}>
                <Text style={styles.footerLine}>Phone: +254 733 959 383</Text>
                <Text style={styles.footerLine}>Email: tamtechtools@gmail.com</Text>
              </View>
              <Text style={styles.footerLine}>Web: Tamtech.co.ke</Text>
              <Text style={styles.developer}>Developer: IMBEKA MUSA</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9F7" },
  screen: { flex: 1, backgroundColor: "#F7F9F7" },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  topLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  topLabel: { color: "#152B27", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  topDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#58A85C" },
  topMeta: { color: "#81918A", fontSize: 9, fontWeight: "700", letterSpacing: 1.1 },
  hero: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 52 },
  logoLockup: { alignItems: "center", justifyContent: "center", minHeight: 222 },
  markWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
  logoMark: { width: 128, height: 128, borderRadius: 64 },
  wordmarkWrap: { width: 240, height: 70, marginTop: 18, alignItems: "center", justifyContent: "center" },
  logoText: { width: 240, height: 70 },
  messageBlock: { alignItems: "center", maxWidth: 480, marginTop: 36 },
  kicker: { color: "#438D50", fontSize: 10, fontWeight: "900", letterSpacing: 2.2, textAlign: "center" },
  mission: { color: "#142A26", fontSize: 28, lineHeight: 35, fontWeight: "800", textAlign: "center", marginTop: 14 },
  supporting: { color: "#71817A", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 12 },
  loginButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#173C35", paddingLeft: 21, paddingRight: 7, paddingVertical: 7, marginTop: 28, borderRadius: 30, shadowColor: "#173C35", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  loginText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  loginIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#54A85C", alignItems: "center", justifyContent: "center", marginLeft: 14 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  lowerContent: { width: "100%" },
  divider: { height: 1, backgroundColor: "#DCE5DF", marginBottom: 20 },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  contactCopy: { flex: 1, paddingRight: 18 },
  contactEyebrow: { color: "#7A9087", fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  contactTitle: { color: "#1D3932", fontSize: 15, fontWeight: "700", marginTop: 5 },
  whatsappButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#299A59", shadowColor: "#299A59", shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  footer: { borderTopWidth: 1, borderTopColor: "#E4EAE5", marginTop: 28, paddingTop: 17 },
  footerCompany: { color: "#1D3932", fontSize: 12, fontWeight: "900", marginBottom: 7 },
  footerLine: { color: "#7B8983", fontSize: 10, lineHeight: 16 },
  footerContactLine: { flexDirection: "row", flexWrap: "wrap", columnGap: 18 },
  developer: { color: "#4E6B60", fontSize: 9, fontWeight: "900", letterSpacing: 1.1, marginTop: 15 },
})
