import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "showroom_audio_enabled"

let cachedAudioEnabled = true
let audioPreferencePromise: Promise<boolean> | null = null
let preferenceVersion = 0

function loadAudioPreference(): Promise<boolean> {
  if (!audioPreferencePromise) {
    const versionAtStart = preferenceVersion
    audioPreferencePromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (versionAtStart === preferenceVersion) cachedAudioEnabled = value !== "false"
        return cachedAudioEnabled
      })
      .catch(() => {
        return cachedAudioEnabled
      })
  }
  return audioPreferencePromise
}

export async function getShowroomAudioEnabled(): Promise<boolean> {
  return loadAudioPreference()
}

export async function setShowroomAudioEnabled(enabled: boolean): Promise<void> {
  preferenceVersion += 1
  const version = preferenceVersion
  cachedAudioEnabled = enabled
  audioPreferencePromise = Promise.resolve(enabled)
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled))
  if (version !== preferenceVersion) return
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
