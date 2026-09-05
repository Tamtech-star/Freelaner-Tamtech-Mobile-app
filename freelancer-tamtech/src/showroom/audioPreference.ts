import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "showroom_audio_enabled"

export async function getShowroomAudioEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    return value !== "false"
  } catch {
    return true
  }
}

export async function setShowroomAudioEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled))
}

export function useShowroomAudioPreference() {
  const [audioEnabled, setAudioEnabled] = useState(true)
  const audioEnabledRef = useRef(true)

  useEffect(() => {
    let mounted = true
    void getShowroomAudioEnabled().then((enabled) => {
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
