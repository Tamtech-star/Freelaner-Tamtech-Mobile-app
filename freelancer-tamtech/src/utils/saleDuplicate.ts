import { getLocalSalesRecords, getPendingSalesRecords } from '../offline/database'

// Canonical key for a sale identifier: upper-case, whitespace-stripped, so
// "KDG 123A", "KDG123A" and "kdg 123a" all compare equal. Mirrors the backend
// `saleIdentifierKey` used on the normalized key columns.
export function saleKey(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase()
}

export type LocalDuplicate = {
  field: 'bikeRegistrationNumber' | 'chassisNumber'
  value: string
  existingConversionCode: string
}

// Best-effort immediate duplicate check against the local DB (synced rows plus
// still-pending offline submissions). Returns the first match, or null.
export async function findLocalDuplicateSale(
  bikeRegistrationNumber: string,
  chassisNumber: string,
  excludeId?: string
): Promise<LocalDuplicate | null> {
  const bikeKey = saleKey(bikeRegistrationNumber)
  const chassisKey = saleKey(chassisNumber)
  if (!bikeKey && !chassisKey) return null

  const synced = await getLocalSalesRecords()
  for (const row of synced) {
    if (excludeId && row.id === excludeId) continue
    if (bikeKey && saleKey(row.bike_registration_number) === bikeKey) {
      return { field: 'bikeRegistrationNumber', value: bikeRegistrationNumber, existingConversionCode: row.conversion_code }
    }
    if (chassisKey && saleKey(row.chassis_number) === chassisKey) {
      return { field: 'chassisNumber', value: chassisNumber, existingConversionCode: row.conversion_code }
    }
  }

  const pending = await getPendingSalesRecords()
  for (const row of pending) {
    if (excludeId && row.id === excludeId) continue
    if (!row.payload_json) continue
    try {
      const payload = JSON.parse(row.payload_json)
      if (bikeKey && saleKey(payload.bikeRegistrationNumber) === bikeKey) {
        return { field: 'bikeRegistrationNumber', value: bikeRegistrationNumber, existingConversionCode: row.conversion_code }
      }
      if (chassisKey && saleKey(payload.chassisNumber) === chassisKey) {
        return { field: 'chassisNumber', value: chassisNumber, existingConversionCode: row.conversion_code }
      }
    } catch {
      // Ignore malformed payload_json — a corrupt pending row must not block submission.
    }
  }

  return null
}
