import { useCallback, useEffect, useState } from "react"
import Constants from "expo-constants"
import { Linking, Platform } from "react-native"
import { fetchLatestVersion, type MobileVersion } from "../api/version"

export interface UpdateInfo {
  version: string
  changelog?: string
  storeUrl: string
  forceUpdate: boolean
}

// Numeric build of the installed binary (Android versionCode / iOS build number).
function installedBuildNumber(): number | null {
  const native = Constants.nativeBuildVersion
  if (native) {
    const n = Number(native)
    if (Number.isFinite(n)) return n
  }
  return null
}

function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0)
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

function isNewer(latest: MobileVersion): boolean {
  const installedBuild = installedBuildNumber()
  if (installedBuild !== null) {
    const latestBuild = Platform.OS === "ios" ? latest.buildNumber : latest.versionCode
    if (typeof latestBuild === "number" && Number.isFinite(latestBuild)) {
      return latestBuild > installedBuild
    }
  }
  // Fallback: semantic-version comparison (web/dev where native build is absent).
  const installedVersion = Constants.expoConfig?.version ?? "0.0.0"
  return semverCompare(latest.version, installedVersion) > 0
}

// Fires once on mount and surfaces a newer build if one exists. Shows on every
// launch until the user updates (no dismissal caching, per product decision).
export function useVersionCheck() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const latest = await fetchLatestVersion()
        if (cancelled) return
        if (latest && isNewer(latest)) {
          setUpdate({
            version: latest.version,
            changelog: latest.changelog,
            storeUrl: latest.storeUrl,
            forceUpdate: latest.forceUpdate,
          })
        }
      } catch {
        // Offline or endpoint error — silently skip; never block launch.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = useCallback(() => setUpdate(null), [])

  const openStore = useCallback(async () => {
    if (!update) return
    const pkg = Constants.expoConfig?.android?.package
    const urls: string[] = []
    if (Platform.OS === "android" && pkg) {
      urls.push(`market://details?id=${pkg}`)
      urls.push(`https://play.google.com/store/apps/details?id=${pkg}`)
    }
    if (update.storeUrl) urls.push(update.storeUrl)
    for (const url of urls) {
      try {
        await Linking.openURL(url)
        return
      } catch {
        // try the next fallback URL
      }
    }
  }, [update])

  return { update, dismiss, openStore }
}
