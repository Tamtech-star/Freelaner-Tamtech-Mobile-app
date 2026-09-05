import { useCallback, useEffect, useRef, useState } from "react"
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Audio } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { router, useFocusEffect } from "expo-router"
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react-native"
import { useShowroomAudioPreference } from "../../../src/showroom/audioPreference"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { BIKE_MODELS, type BikeHotspot } from "../../../src/data/bikeModels"

const { width } = Dimensions.get("window")
const STAGE_WIDTH = Math.min(width - 32, 720)
const STAGE_HEIGHT = Math.min(Math.max(width * 1.08, 430), 620)

function Hotspot({
  hotspot,
  onPress,
}: {
  hotspot: BikeHotspot
  onPress: (hotspot: BikeHotspot) => void
}) {
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [pulse])

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.7, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.7, 2.15]) }],
  }))

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.08]) }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${hotspot.title}`}
      onPress={() => onPress(hotspot)}
      style={[styles.hotspotTouch, { top: hotspot.top, left: hotspot.left }]}
    >
      <Animated.View style={[styles.hotspotHalo, haloStyle]} />
      <Animated.View style={[styles.hotspotDot, dotStyle]}>
        <View style={styles.hotspotCore} />
      </Animated.View>
      <Text style={styles.hotspotLabel}>{hotspot.label}</Text>
    </Pressable>
  )
}

export default function KnowYourBikeScreen() {
  const { audioEnabled, audioEnabledRef, setAudioPreference } = useShowroomAudioPreference()
  const [selectedHotspot, setSelectedHotspot] = useState<BikeHotspot | null>(null)
  const [selectedColorId, setSelectedColorId] = useState("blue")
  const [galleryIndex, setGalleryIndex] = useState(0)
  const ambientSoundRef = useRef<Audio.Sound | null>(null)
  const hotspotSoundRef = useRef<Audio.Sound | null>(null)
  const ambientStartRef = useRef<Promise<void> | null>(null)
  const ambientRequestRef = useRef(0)
  const soundRequestRef = useRef(0)
  const float = useSharedValue(0)
  const model = BIKE_MODELS[0]
  const selectedColor = model.colors.find((color) => color.id === selectedColorId) ?? model.colors[0]
  const galleryImages = selectedColor.images
  const galleryImage = galleryImages[galleryIndex] ?? model.image

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [float])

  const bikeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-7, 9]) },
      { scale: interpolate(float.value, [0, 1], [0.99, 1.015]) },
    ],
  }))

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(float.value, [0, 1], [0.52, 0.3]),
    transform: [{ scaleX: interpolate(float.value, [0, 1], [1, 0.86]) }],
  }))
  const stopAmbientSound = useCallback(async () => {
    ambientRequestRef.current += 1
    const sound = ambientSoundRef.current
    ambientSoundRef.current = null
    if (!sound) return
    try {
      await sound.stopAsync()
    } catch {
      // The route may already have stopped playback while losing focus.
    }
    try {
      await sound.unloadAsync()
    } catch {
      // Ignore cleanup errors during navigation.
    }
  }, [])

  const startAmbientSound = useCallback(async () => {
    await stopAmbientSound()
    const requestId = ambientRequestRef.current + 1
    ambientRequestRef.current = requestId
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../../assets/sounds/bike-studio-ambient.mp3"),
        { shouldPlay: audioEnabledRef.current, isLooping: true, volume: 0.3 },
      )
      if (ambientRequestRef.current !== requestId) {
        await sound.unloadAsync()
        return
      }
      ambientSoundRef.current = sound
    } catch {
      // Keep the studio usable if ambient playback is unavailable.
    }
  }, [stopAmbientSound])

  const pauseAmbientSound = useCallback(async () => {
    await ambientStartRef.current
    const sound = ambientSoundRef.current
    if (!sound) return
    try {
      await sound.pauseAsync()
    } catch {
      // Ignore pause errors if route focus changed during the interaction.
    }
  }, [])

  const resumeAmbientSound = useCallback(async () => {
    if (!audioEnabledRef.current) return
    await ambientStartRef.current
    const sound = ambientSoundRef.current
    if (!sound) return
    try {
      await sound.playAsync()
    } catch {
      // Keep the studio usable if playback cannot resume.
    }
  }, [])

  const stopHotspotSound = useCallback(async () => {
    soundRequestRef.current += 1
    const sound = hotspotSoundRef.current
    hotspotSoundRef.current = null
    if (!sound) return
    try {
      await sound.stopAsync()
    } catch {
      // The sound may already have completed or unloaded.
    }
    try {
      await sound.unloadAsync()
    } catch {
      // Ignore cleanup errors during navigation/unmount.
    }
  }, [])

  const playHotspotSound = useCallback(async (hotspot: BikeHotspot) => {
    if (!audioEnabledRef.current) return
    await pauseAmbientSound()
    await stopHotspotSound()
    const requestId = soundRequestRef.current + 1
    soundRequestRef.current = requestId
    try {
      const soundSource = hotspot.id === "motor"
        ? require("../../../assets/sounds/power.mp3")
        : require("../../../assets/sounds/core.mp3")
      const { sound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: false, volume: 0.22 },
      )
      if (soundRequestRef.current !== requestId) {
        await sound.unloadAsync()
        return
      }
      hotspotSoundRef.current = sound
      await sound.playAsync()
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          hotspotSoundRef.current = null
          void sound.unloadAsync()
        }
      })
    } catch {
      // The visual interaction remains available if audio playback is unavailable.
    }
  }, [pauseAmbientSound, stopHotspotSound])

  const openHotspot = useCallback(
    (hotspot: BikeHotspot) => {
      setSelectedHotspot(hotspot)
      void playHotspotSound(hotspot)
    },
    [playHotspotSound],
  )

  const closeHotspot = useCallback(() => {
    setSelectedHotspot(null)
    void (async () => {
      await stopHotspotSound()
      await resumeAmbientSound()
    })()
  }, [resumeAmbientSound, stopHotspotSound])

  useFocusEffect(
    useCallback(() => {
      const startRequest = startAmbientSound()
      ambientStartRef.current = startRequest
      void startRequest.finally(() => {
        if (ambientStartRef.current === startRequest) ambientStartRef.current = null
      })
      return () => {
        setSelectedHotspot(null)
        void stopHotspotSound()
        void stopAmbientSound()
      }
    }, [startAmbientSound, stopAmbientSound, stopHotspotSound]),
  )

  const leaveStudio = useCallback(async () => {
    setSelectedHotspot(null)
    await stopHotspotSound()
    await stopAmbientSound()
    router.back()
  }, [stopAmbientSound, stopHotspotSound])

  const toggleAudio = useCallback(() => {
    const enabled = !audioEnabledRef.current
    void setAudioPreference(enabled)
    if (enabled) void startAmbientSound()
    else void pauseAmbientSound()
  }, [audioEnabledRef, pauseAmbientSound, setAudioPreference, startAmbientSound])

  useEffect(() => {
    if (!audioEnabled) {
      void pauseAmbientSound()
      void stopHotspotSound()
    }
  }, [audioEnabled, pauseAmbientSound, stopHotspotSound])

  const selectColor = (colorId: string) => {
    const color = model.colors.find((item) => item.id === colorId)
    if (!color?.available || color.images.length === 0) return
    setSelectedColorId(colorId)
    setGalleryIndex(0)
  }

  const moveGallery = (direction: -1 | 1) => {
    if (galleryImages.length < 2) return
    setGalleryIndex((current) => (current + direction + galleryImages.length) % galleryImages.length)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { void leaveStudio() }} style={styles.iconButton}>
            <ChevronLeft size={23} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>KNOW YOUR BIKE</Text>
            <Text style={styles.headerTitle}>Studio view</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={audioEnabled ? "Mute showroom music" : "Unmute showroom music"} onPress={toggleAudio} style={styles.audioButton}>
            {audioEnabled ? <Volume2 size={18} color="#FFFFFF" /> : <VolumeX size={18} color="#8D9298" />}
          </Pressable>
          <Text style={styles.headerModel}>01 MODEL</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.stage, { width: STAGE_WIDTH, height: STAGE_HEIGHT }]}>
            <LinearGradient
              colors={["#10242A", "#091013", "#000000"]}
              locations={[0, 0.54, 1]}
              style={styles.spotlight}
            />
            <View style={styles.studioGrid} />
            <Animated.View style={[styles.bikeShadow, shadowStyle]} />
            <Animated.View key={model.id} entering={FadeIn.duration(420)} style={[styles.bikeFrame, bikeStyle]}>
              <Image source={model.image} style={styles.bikeImage} resizeMode="contain" />
            </Animated.View>
            {model.hotspots.map((hotspot) => (
              <Hotspot key={`${model.id}-${hotspot.id}`} hotspot={hotspot} onPress={openHotspot} />
            ))}
            <View style={styles.tapHint}>
              <View style={styles.tapHintDot} />
              <Text style={styles.tapHintText}>TAP A GLOW POINT</Text>
            </View>
          </View>

          <View style={styles.modelMeta}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelTagline}>{model.tagline}</Text>
            <Text style={styles.modelPrice}>{model.price}</Text>
            <View style={styles.gallery}>
              <Image source={galleryImage} style={styles.galleryImage} resizeMode="cover" />
              <LinearGradient colors={["transparent", "#000000CC"]} style={styles.galleryShade} />
              <View style={styles.galleryTopRow}>
                <Text style={styles.galleryLabel}>{selectedColor.name.toUpperCase()}</Text>
                <Text style={styles.galleryCount}>{String(galleryIndex + 1).padStart(2, "0")} / {String(Math.max(galleryImages.length, 1)).padStart(2, "0")}</Text>
              </View>
              <View style={styles.galleryControls}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous bike photo" disabled={galleryImages.length < 2} onPress={() => moveGallery(-1)} style={[styles.galleryArrow, galleryImages.length < 2 && styles.galleryArrowDisabled]}>
                  <ChevronLeft size={22} color="#FFFFFF" />
                </Pressable>
                <View style={styles.galleryDots}>
                  {galleryImages.map((_, index) => <View key={`${selectedColor.id}-${index}`} style={[styles.galleryDot, index === galleryIndex && styles.galleryDotActive]} />)}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Next bike photo" disabled={galleryImages.length < 2} onPress={() => moveGallery(1)} style={[styles.galleryArrow, galleryImages.length < 2 && styles.galleryArrowDisabled]}>
                  <ChevronRight size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
            <Text style={styles.colorHeading}>FACTORY COLOUR</Text>
            <View style={styles.colorOptions}>
              {model.colors.map((color) => (
                <Pressable
                  key={color.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedColor.id === color.id, disabled: !color.available }}
                  accessibilityLabel={`Select ${color.name}`}
                  disabled={!color.available}
                  onPress={() => selectColor(color.id)}
                  style={[styles.colorButton, selectedColor.id === color.id && styles.colorButtonActive, !color.available && styles.colorButtonDisabled]}
                >
                  <View style={[styles.colorDot, { backgroundColor: color.swatch }]} />
                  <Text style={[styles.colorText, selectedColor.id === color.id && styles.colorTextActive, !color.available && styles.colorTextDisabled]}>{color.name}{!color.available ? " · SOON" : ""}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {selectedHotspot ? (
          <>
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={styles.scrim}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeHotspot} />
            </Animated.View>
            <Animated.View entering={SlideInDown.springify().damping(19)} exiting={SlideOutDown.duration(240)} style={styles.specPanel}>
              <View style={styles.specGrabber} />
              <View style={styles.specTopRow}>
                <Text style={styles.specEyebrow}>{selectedHotspot.label} SYSTEM</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close specification" onPress={closeHotspot} style={styles.closeButton}>
                  <X size={20} color="#FFFFFF" />
                </Pressable>
              </View>
              <Text style={styles.specTitle}>{selectedHotspot.title}</Text>
              <Text style={styles.specDescription}>{selectedHotspot.description}</Text>
              <View style={styles.specPoints}>
                {selectedHotspot.points.map((point) => (
                  <View key={point} style={styles.specPointRow}>
                    <View style={styles.specPoint} />
                    <Text style={styles.specPointText}>{point}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specFooter}>
                <Text style={styles.specFooterLabel}>MODEL</Text>
                <Text style={styles.specFooterValue}>{model.name}</Text>
              </View>
            </Animated.View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000000" },
  screen: { flex: 1, backgroundColor: "#000000" },
  header: { height: 78, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1E1E1E" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#292929", backgroundColor: "#090909" },
  headerCopy: { flex: 1, marginLeft: 14 },
  headerEyebrow: { color: "#37E6FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 3 },
  headerModel: { color: "#5E6468", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  audioButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#292929", backgroundColor: "#090909", marginRight: 10 },
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", paddingTop: 16, paddingBottom: 40 },
  stage: { borderWidth: 1, borderColor: "#20282A", backgroundColor: "#020303", overflow: "hidden" },
  spotlight: { ...StyleSheet.absoluteFillObject },
  studioGrid: { position: "absolute", left: "10%", right: "10%", bottom: "12%", height: 1, backgroundColor: "#31525B" },
  bikeFrame: { position: "absolute", top: "12%", left: "4%", right: "4%", bottom: "14%", alignItems: "center", justifyContent: "center" },
  bikeImage: { width: "100%", height: "100%" },
  bikeShadow: { position: "absolute", width: "60%", height: 22, borderRadius: 22, backgroundColor: "#000000", bottom: "13%", left: "20%", shadowColor: "#000000", shadowOpacity: 0.9, shadowRadius: 18 },
  hotspotTouch: { position: "absolute", width: 74, height: 74, marginLeft: -37, marginTop: -37, alignItems: "center", justifyContent: "center" },
  hotspotHalo: { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#37E6FF", backgroundColor: "#37E6FF33" },
  hotspotDot: { width: 23, height: 23, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#021215", borderWidth: 1, borderColor: "#9AF4FF", shadowColor: "#37E6FF", shadowOpacity: 1, shadowRadius: 12, elevation: 8 },
  hotspotCore: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },
  hotspotLabel: { position: "absolute", top: 53, color: "#C7F9FF", fontSize: 8, fontWeight: "900", letterSpacing: 1.2, backgroundColor: "#000000B8", paddingHorizontal: 5, paddingVertical: 2 },
  tapHint: { position: "absolute", left: 14, bottom: 14, flexDirection: "row", alignItems: "center", gap: 7 },
  tapHintDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#37E6FF" },
  tapHintText: { color: "#7D8B8F", fontSize: 8, fontWeight: "900", letterSpacing: 1.25 },
  modelMeta: { width: STAGE_WIDTH, paddingTop: 24, paddingHorizontal: 4 },
  modelName: { color: "#FFFFFF", fontSize: 30, lineHeight: 34, fontWeight: "900" },
  modelTagline: { color: "#858B90", fontSize: 14, lineHeight: 21, marginTop: 7 },
  modelPrice: { color: "#37E6FF", fontSize: 16, fontWeight: "800", marginTop: 13 },
  gallery: { height: 210, marginTop: 22, borderWidth: 1, borderColor: "#253033", backgroundColor: "#050707", overflow: "hidden" },
  galleryImage: { width: "100%", height: "100%" },
  galleryShade: { ...StyleSheet.absoluteFillObject },
  galleryTopRow: { position: "absolute", top: 12, left: 13, right: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  galleryLabel: { color: "#D7FFFF", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  galleryCount: { color: "#A2ABAE", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  galleryControls: { position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  galleryArrow: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#718084", backgroundColor: "#00000088" },
  galleryArrowDisabled: { opacity: 0.35 },
  galleryDots: { flexDirection: "row", alignItems: "center", gap: 6 },
  galleryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#798386" },
  galleryDotActive: { width: 22, backgroundColor: "#FFFFFF" },
  colorHeading: { color: "#5E686C", fontSize: 9, fontWeight: "900", letterSpacing: 1.5, marginTop: 22, marginBottom: 10 },
  colorOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#252B2D", paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "#070909" },
  colorButtonActive: { borderColor: "#37E6FF", backgroundColor: "#0B1719" },
  colorButtonDisabled: { opacity: 0.48 },
  colorDot: { width: 9, height: 9, borderRadius: 5 },
  colorText: { color: "#70797C", fontSize: 9, fontWeight: "700" },
  colorTextActive: { color: "#D7FFFF" },
  colorTextDisabled: { color: "#5B6264" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000000B8", zIndex: 20 },
  specPanel: { position: "absolute", zIndex: 30, left: 12, right: 12, bottom: 12, padding: 24, backgroundColor: "#101415F7", borderWidth: 1, borderColor: "#3A4A4E" },
  specGrabber: { width: 46, height: 3, backgroundColor: "#596367", alignSelf: "center", marginBottom: 22 },
  specTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  specEyebrow: { color: "#37E6FF", fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  closeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#353B3D" },
  specTitle: { color: "#FFFFFF", fontSize: 27, fontWeight: "900", marginTop: 20 },
  specDescription: { color: "#A7AFB2", fontSize: 15, lineHeight: 23, marginTop: 10 },
  specPoints: { gap: 9, marginTop: 17 },
  specPointRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  specPoint: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#37E6FF", marginTop: 6 },
  specPointText: { flex: 1, color: "#C2CBCC", fontSize: 12, lineHeight: 18 },
  specDivider: { height: 1, backgroundColor: "#2A3032", marginVertical: 22 },
  specFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  specFooterLabel: { color: "#626B6E", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  specFooterValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
})
