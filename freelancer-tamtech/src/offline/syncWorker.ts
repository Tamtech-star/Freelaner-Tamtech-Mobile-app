import NetInfo from "@react-native-community/netinfo"
import api from "../api/client"
import type { FreelancerRow } from "../api/admin"
import type { SalesHistoryResponse } from "../api/salesRecord"
import {
  getPendingSalesRecords,
  getSyncCursor,
  getLocalSalesRecords,
  removeSyncedPendingSalesRecord,
  setSalesRecordSyncError,
  setSyncCursor,
  upsertFreelancers,
  upsertSalesRecords,
} from "./database"
import { shouldRunRemoteSync } from "./syncCore"
import { isSyncCursorStale } from "./syncPolicy"

export type PersistedFile = { uri: string; name: string; type: string }
export type OfflineSubmissionPayload = Record<string, string | PersistedFile | null>

const dataListeners = new Set<() => void>()
const syncErrorListeners = new Set<() => void>()
let activeSync: Promise<{ pulled: boolean; pushed: number }> | null = null

export function subscribeToOfflineData(listener: () => void): () => void {
  dataListeners.add(listener)
  return () => dataListeners.delete(listener)
}

export function notifyDataChanged(): void {
  for (const listener of dataListeners) listener()
}

export function subscribeToSyncErrors(listener: () => void): () => void {
  syncErrorListeners.add(listener)
  return () => syncErrorListeners.delete(listener)
}

function notifySyncError(): void {
  for (const listener of syncErrorListeners) listener()
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
  const [freelancersResult, salesResult] = await Promise.allSettled([
    api.get<{ freelancers: FreelancerRow[] }>("/portal/admin/freelancers"),
    api.get<SalesHistoryResponse>("/sales-record/history"),
  ])
  const now = new Date().toISOString()

  if (freelancersResult.status === "fulfilled") {
    await upsertFreelancers(freelancersResult.value.data.freelancers || [], now)
  }
  if (salesResult.status === "fulfilled") {
    await upsertSalesRecords(salesResult.value.data.items || [], now)
  }
  if (freelancersResult.status === "rejected" && salesResult.status === "rejected") {
    throw salesResult.reason
  }

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
    } catch (err) {
      // Leave the row pending, but record the reason so the sales-record screen
      // can surface it. Emit on the dedicated sync-error channel (not
      // notifyDataChanged) so a persistently failing record can't trigger a
      // re-sync loop through the local-first read's stale-while-revalidate.
      const message = (err as any)?.response?.data?.error || (err as any)?.message || "Sync failed."
      await setSalesRecordSyncError(row.id, message).catch(() => undefined)
      notifySyncError()
    }
  }
  return synced
}

async function performSync(forcePull: boolean): Promise<{ pulled: boolean; pushed: number }> {
  const network = await NetInfo.fetch()
  if (!shouldRunRemoteSync(network)) return { pulled: false, pushed: 0 }
  const pushed = await pushPending()
  const cursorFresh = !isSyncCursorStale(await getSyncCursor("last_pull_at"))
  // Pull when forced (manual refresh), when the cursor is stale (background),
  // or when we just pushed pending records — so freshly minted CNV codes replace
  // the LOCAL ones on the device immediately rather than waiting for a later pull.
  if (!forcePull && cursorFresh && pushed === 0) return { pulled: false, pushed }
  await pullChanges()
  return { pulled: true, pushed }
}

function runSyncWorkerInternal(forcePull: boolean): Promise<{ pulled: boolean; pushed: number }> {
  if (activeSync) return activeSync
  activeSync = performSync(forcePull).finally(() => {
    activeSync = null
  })
  return activeSync
}

export function runSyncWorker(): Promise<{ pulled: boolean; pushed: number }> {
  // Full/manual sync: always push pending AND always pull fresh data.
  return runSyncWorkerInternal(true)
}

export function runSyncWorkerIfStale(): Promise<{ pulled: boolean; pushed: number }> {
  // Background sync (reconnect, stale-while-revalidate): ALWAYS push pending
  // offline submissions immediately; only the pull is rate-limited by the cursor.
  return runSyncWorkerInternal(false)
}

export function startSyncWorker(): () => void {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      await runSyncWorkerIfStale()
    } catch {
      // Remote sync is best-effort. Keep cached data and pending submissions
      // available when the API is unreachable; NetInfo will retry later.
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
  void runSyncWorkerIfStale().catch(() => undefined)
  return cached
}

export async function getLastPullAt(): Promise<string | null> {
  return getSyncCursor("last_pull_at")
}
