import api from "./client"

export interface MobileVersion {
  version: string
  versionCode: number
  buildNumber: number
  storeUrl: string
  forceUpdate: boolean
  changelog?: string
}

// Fetches the latest production build info from the backend. The endpoint
// reads the newest active row in the app_versions table (service-role key).
export async function fetchLatestVersion(): Promise<MobileVersion> {
  const response = await api.get<MobileVersion>("/mobile-version")
  return response.data
}
