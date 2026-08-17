export const AUTO_SYNC_MAX_AGE_MS = 15 * 60 * 1000

export function isSyncCursorStale(
  cursor: string | null,
  now = new Date().toISOString(),
  maxAgeMs = AUTO_SYNC_MAX_AGE_MS,
): boolean {
  if (!cursor) return true
  const cursorTime = Date.parse(cursor)
  const nowTime = Date.parse(now)
  if (!Number.isFinite(cursorTime) || !Number.isFinite(nowTime)) return true
  return nowTime - cursorTime >= maxAgeMs
}
