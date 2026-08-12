import NetInfo from "@react-native-community/netinfo"
import api from "../api/client"
import type { FreelancerRow } from "../api/admin"
import type { SalesHistoryResponse } from "../api/salesRecord"
import {
  getPendingSalesRecords,
  getSyncCursor,
  getLocalSalesRecords,
  removeSyncedPendingSalesRecord,
  setSyncCursor,
  upsertFreelancers,
  upsertSalesRecords,
} from "./database"
import { shouldRunRemoteSync } from "./syncCore"

export type PersistedFile = { uri: string; name: string; type: string }
export type OfflineSubmissionPayload = Record<string, string | PersistedFile | null>

const dataListeners = new Set<() => void>()
let activeSync: Promise<{ pulled: boolean; pushed: number }> | null = null

export function subscribeToOfflineData(listener: () => void): () => void {
  dataListeners.add(listener)
  return () => dataListeners.delete(listener)
}

function notifyDataChanged(): void {
  for (const listener of dataListeners) listener()
}

function appendPayload(formData: FormData, payload: OfflineSubmissionPayload): void {
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue
    if (typeof value === "object") {
      formData.append(key, value as any)
    } else {
      formData.append(key, value)
    }
  }
}

export function createFormDataFromPayload(payload: OfflineSubmissionPayload): FormData {
  const formData = new FormData()
  appendPayload(formData, payload)
  return formData
}

async function pullChanges(): Promise<void> {
  const [freelancersResponse, salesResponse] = await Promise.all([
    api.get<{ freelancers: FreelancerRow[] }>("/portal/admin/freelancers"),
    api.get<SalesHistoryResponse>("/sales-record/history"),
  ])
  const freelancers = freelancersResponse.data.freelancers || []
  const sales = salesResponse.data.items || []
  const now = new Date().toISOString()
  await Promise.all([upsertFreelancers(freelancers, now), upsertSalesRecords(sales, now)])
  await setSyncCursor("last_pull_at", now)
  notifyDataChanged()
}

async function pushPending(): Promise<number> {
  const pending = await getPendingSalesRecords()
  let synced = 0
  for (const row of pending) {
    if (!row.payload_json) continue
    try {
      const payload = JSON.parse(row.payload_json) as OfflineSubmissionPayload
      const response = await api.post<{ conversionCode: string; submissionType?: string }>("/sales-record", createFormDataFromPayload(payload))
      if (!response.data.conversionCode) throw new Error("Server did not return a conversion code")
      await removeSyncedPendingSalesRecord(row.id)
      synced += 1
      notifyDataChanged()
    } catch {
      // Leave the row pending. A later connectivity event retries it.
    }
  }
  return synced
}

async function performSync(): Promise<{ pulled: boolean; pushed: number }> {
  const network = await NetInfo.fetch()
  if (!shouldRunRemoteSync(network)) return { pulled: false, pushed: 0 }
  const pushed = await pushPending()
  await pullChanges()
  return { pulled: true, pushed }
}

export function runSyncWorker(): Promise<{ pulled: boolean; pushed: number }> {
  if (activeSync) return activeSync
  activeSync = performSync().finally(() => {
    activeSync = null
  })
  return activeSync
}

export function startSyncWorker(): () => void {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      await runSyncWorker()
    } finally {
      running = false
    }
  }
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (shouldRunRemoteSync(state)) void run()
  })
  void run()
  return unsubscribe
}

export async function getCachedSalesThenSync(): Promise<ReturnType<typeof getLocalSalesRecords>> {
  const cached = await getLocalSalesRecords()
  void runSyncWorker().catch(() => undefined)
  return cached
}

export async function getLastPullAt(): Promise<string | null> {
  return getSyncCursor("last_pull_at")
}
