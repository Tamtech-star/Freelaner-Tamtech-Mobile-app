import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "showroom_audio_enabled"

let cachedAudioEnabled = true
let audioPreferencePromise: Promise<boolean> | null = null

function loadAudioPreference(): Promise<boolean> {
  if (!audioPreferencePromise) {
    audioPreferencePromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        cachedAudioEnabled = value !== "false"
        audioPreferenceReady = true
        return cachedAudioEnabled
      })
      .catch(() => {
        audioPreferenceReady = true
        return cachedAudioEnabled
      })
  }
  return audioPreferencePromise
}

export async function getShowroomAudioEnabled(): Promise<boolean> {
  return loadAudioPreference()
}

export async function setShowroomAudioEnabled(enabled: boolean): Promise<void> {
  cachedAudioEnabled = enabled
  audioPreferenceReady = true
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled))
}

export function isShowroomAudioEnabled(): boolean {
  return cachedAudioEnabled
}

export function useShowroomAudioPreference() {
  const [audioEnabled, setAudioEnabled] = useState(cachedAudioEnabled)
  const audioEnabledRef = useRef(cachedAudioEnabled)

  useEffect(() => {
    let mounted = true
    void loadAudioPreference().then((enabled) => {
      if (!mounted) return
      audioEnabledRef.current = enabled
      setAudioEnabled(enabled)
    })
    return () => {
      mounted = false
    }
  }, [])

  const setAudioPreference = useCallback(async (enabled: boolean) => {
    audioEnabledRef.current = enabled
    setAudioEnabled(enabled)
    try {
      await setShowroomAudioEnabled(enabled)
    } catch {
      // Keep the in-memory preference active if storage is temporarily unavailable.
    }
  }, [])

  return { audioEnabled, audioEnabledRef, setAudioPreference }
}
