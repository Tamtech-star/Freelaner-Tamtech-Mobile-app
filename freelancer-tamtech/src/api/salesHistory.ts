import { getLocalSalesRecords } from "../offline/database"
import { runSyncWorker, runSyncWorkerIfStale } from "../offline/syncWorker"
import type { SalesRecordItem } from "./salesRecord"

export async function getSalesHistoryLocalFirst(): Promise<SalesRecordItem[]> {
  const cached = await getLocalSalesRecords()
  void runSyncWorkerIfStale().catch(() => undefined)
  return cached
}

export async function syncSalesHistoryNow(): Promise<SalesRecordItem[]> {
  await runSyncWorker()
  return getLocalSalesRecords()
}
