import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite"
import type { FreelancerRow } from "../api/admin"
import type { SalesRecordItem } from "../api/salesRecord"
import type { PendingSalesRecord } from "./syncCore"

export type MaterialRow = {
  id: string
  name: string
  description: string | null
  quantity: number
  updated_at: string
}

type LocalSalesRow = SalesRecordItem & {
  sync_status: string
  updated_at: string
  payload_json: string | null
}

const EXTENDED_SALES_COLUMNS = [
  ["customer_type", "TEXT"], ["customer_id_number", "TEXT"], ["customer_phone", "TEXT"],
  ["kra_pin", "TEXT"], ["customer_location", "TEXT"], ["bike_registration_number", "TEXT"],
  ["chassis_number", "TEXT"], ["finance_details", "TEXT"], ["bike_color", "TEXT"],
  ["has_insurance", "INTEGER"], ["insurance_type", "TEXT"], ["has_tracker", "INTEGER"],
  ["tracker_duration", "TEXT"], ["referral_name", "TEXT"], ["deployment_name", "TEXT"],
] as const

let databasePromise: Promise<SQLiteDatabase> | null = null
let initializationPromise: Promise<SQLiteDatabase> | null = null

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) databasePromise = openDatabaseAsync("tamtech-offline.db")
  return databasePromise
}

export async function initializeDatabase(): Promise<SQLiteDatabase> {
  if (initializationPromise) return initializationPromise
  initializationPromise = (async () => {
    const db = await getDatabase()
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS cached_resources (
      key TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS freelancers (
      id TEXT PRIMARY KEY NOT NULL,
      freelancer_code TEXT NOT NULL,
      display_code TEXT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      mpesa_phone TEXT,
      registration_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sales_records (
      id TEXT PRIMARY KEY NOT NULL,
      conversion_code TEXT NOT NULL,
      submission_type TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      freight TEXT NOT NULL,
      sales_agent_name TEXT NOT NULL,
      sales_invoice_number TEXT NOT NULL,
      bike_model_sold TEXT NOT NULL,
      sale_date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      commission_kes TEXT NOT NULL,
      paid_kes REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL,
      freelancer_name TEXT,
      payment_type TEXT,
      invoice_photo_url TEXT,
      agreement_photo_url TEXT,
      id_doc_url TEXT,
      kra_doc_url TEXT,
      bike_photo_url TEXT,
      chassis_photo_url TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at TEXT NOT NULL,
      payload_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales_records(sync_status);
    CREATE INDEX IF NOT EXISTS idx_sales_updated_at ON sales_records(updated_at);
    CREATE INDEX IF NOT EXISTS idx_freelancers_updated_at ON freelancers(updated_at);
    CREATE INDEX IF NOT EXISTS idx_materials_updated_at ON materials(updated_at);
    `)
    const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(sales_records)")
    const names = new Set(columns.map((column) => column.name))
    for (const [name, type] of EXTENDED_SALES_COLUMNS) {
      if (!names.has(name)) await db.execAsync(`ALTER TABLE sales_records ADD COLUMN ${name} ${type}`)
    }
    return db
  })().catch((error) => {
    initializationPromise = null
    throw error
  })
  return initializationPromise
}

function salesParams(row: SalesRecordItem & { sync_status?: string; updated_at: string; payload_json?: string | null }) {
  return [
    row.id, row.conversion_code, row.submission_type, row.customer_name, row.freight,
    row.sales_agent_name, row.sales_invoice_number, row.bike_model_sold, row.sale_date,
    row.quantity, row.commission_kes, row.paid_kes, row.payment_status, row.freelancer_name ?? null,
    row.payment_type ?? null, row.invoice_photo_url ?? null, row.agreement_photo_url ?? null,
    row.id_doc_url ?? null, row.kra_doc_url ?? null, row.bike_photo_url ?? null,
    row.chassis_photo_url ?? null, row.sync_status ?? "synced", row.updated_at,
    row.payload_json ?? null,
    row.customer_type ?? null, row.customer_id_number ?? null, row.customer_phone ?? null,
    row.kra_pin ?? null, row.customer_location ?? null, row.bike_registration_number ?? null,
    row.chassis_number ?? null, row.finance_details ?? null, row.bike_color ?? null,
    row.has_insurance == null ? null : row.has_insurance ? 1 : 0, row.insurance_type ?? null,
    row.has_tracker == null ? null : row.has_tracker ? 1 : 0, row.tracker_duration ?? null,
    row.referral_name ?? null, row.deployment_name ?? null,
  ]
}

export async function getLocalSalesRecords(): Promise<SalesRecordItem[]> {
  const db = await initializeDatabase()
  const rows = await db.getAllAsync<LocalSalesRow>("SELECT * FROM sales_records ORDER BY sale_date DESC, updated_at DESC")
  return rows.map(({ sync_status: _sync, updated_at: _updated, payload_json: _payload, ...sale }) => sale)
}

export async function upsertSalesRecords(records: SalesRecordItem[], updatedAt = new Date().toISOString()): Promise<void> {
  const db = await initializeDatabase()
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const row of records) {
      await txn.runAsync(
        `INSERT INTO sales_records (id, conversion_code, submission_type, customer_name, freight, sales_agent_name, sales_invoice_number, bike_model_sold, sale_date, quantity, commission_kes, paid_kes, payment_status, freelancer_name, payment_type, invoice_photo_url, agreement_photo_url, id_doc_url, kra_doc_url, bike_photo_url, chassis_photo_url, sync_status, updated_at, payload_json, customer_type, customer_id_number, customer_phone, kra_pin, customer_location, bike_registration_number, chassis_number, finance_details, bike_color, has_insurance, insurance_type, has_tracker, tracker_duration, referral_name, deployment_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET conversion_code=excluded.conversion_code, submission_type=excluded.submission_type, customer_name=excluded.customer_name, freight=excluded.freight, sales_agent_name=excluded.sales_agent_name, sales_invoice_number=excluded.sales_invoice_number, bike_model_sold=excluded.bike_model_sold, sale_date=excluded.sale_date, quantity=excluded.quantity, commission_kes=excluded.commission_kes, paid_kes=excluded.paid_kes, payment_status=excluded.payment_status, freelancer_name=excluded.freelancer_name, payment_type=excluded.payment_type, invoice_photo_url=excluded.invoice_photo_url, agreement_photo_url=excluded.agreement_photo_url, id_doc_url=excluded.id_doc_url, kra_doc_url=excluded.kra_doc_url, bike_photo_url=excluded.bike_photo_url, chassis_photo_url=excluded.chassis_photo_url, updated_at=excluded.updated_at, customer_type=excluded.customer_type, customer_id_number=excluded.customer_id_number, customer_phone=excluded.customer_phone, kra_pin=excluded.kra_pin, customer_location=excluded.customer_location, bike_registration_number=excluded.bike_registration_number, chassis_number=excluded.chassis_number, finance_details=excluded.finance_details, bike_color=excluded.bike_color, has_insurance=excluded.has_insurance, insurance_type=excluded.insurance_type, has_tracker=excluded.has_tracker, tracker_duration=excluded.tracker_duration, referral_name=excluded.referral_name, deployment_name=excluded.deployment_name`,
        salesParams({ ...row, updated_at: updatedAt }),
      )
    }
  })
}

export async function insertPendingSalesRecord(record: PendingSalesRecord): Promise<void> {
  const db = await initializeDatabase()
  await db.runAsync(
    `INSERT INTO sales_records (id, conversion_code, submission_type, customer_name, freight, sales_agent_name, sales_invoice_number, bike_model_sold, sale_date, quantity, commission_kes, paid_kes, payment_status, freelancer_name, payment_type, invoice_photo_url, agreement_photo_url, id_doc_url, kra_doc_url, bike_photo_url, chassis_photo_url, sync_status, updated_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.id, record.conversion_code, record.submission_type, record.customer_name, record.freight,
    record.sales_agent_name, record.sales_invoice_number, record.bike_model_sold, record.sale_date,
    record.quantity, record.commission_kes, record.paid_kes, record.payment_status, record.freelancer_name ?? null,
    record.payment_type ?? null, record.invoice_photo_url ?? null, record.agreement_photo_url ?? null,
    record.id_doc_url ?? null, record.kra_doc_url ?? null, record.bike_photo_url ?? null,
    record.chassis_photo_url ?? null, record.sync_status, record.updated_at, record.payload_json,
  )
}

export async function getPendingSalesRecords(): Promise<LocalSalesRow[]> {
  const db = await initializeDatabase()
  return db.getAllAsync<LocalSalesRow>("SELECT * FROM sales_records WHERE sync_status = 'pending' ORDER BY updated_at ASC LIMIT 25")
}

export async function removeSyncedPendingSalesRecord(id: string): Promise<void> {
  const db = await initializeDatabase()
  await db.runAsync("DELETE FROM sales_records WHERE id = ? AND sync_status = 'pending'", id)
}

export async function getLocalFreelancers(): Promise<FreelancerRow[]> {
  const db = await initializeDatabase()
  return db.getAllAsync<FreelancerRow>("SELECT id, freelancer_code, display_code, full_name, email, mpesa_phone, registration_status, created_at FROM freelancers ORDER BY created_at DESC")
}

export async function upsertFreelancers(rows: FreelancerRow[], updatedAt = new Date().toISOString()): Promise<void> {
  const db = await initializeDatabase()
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const row of rows) {
      await txn.runAsync(
        `INSERT INTO freelancers (id, freelancer_code, display_code, full_name, email, mpesa_phone, registration_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET freelancer_code=excluded.freelancer_code, display_code=excluded.display_code, full_name=excluded.full_name, email=excluded.email, mpesa_phone=excluded.mpesa_phone, registration_status=excluded.registration_status, created_at=excluded.created_at, updated_at=excluded.updated_at`,
        row.id, row.freelancer_code, row.display_code ?? null, row.full_name, row.email, row.mpesa_phone ?? null, row.registration_status, row.created_at, updatedAt,
      )
    }
  })
}

export async function deleteLocalFreelancer(id: string): Promise<void> {
  const db = await initializeDatabase()
  await db.runAsync("DELETE FROM freelancers WHERE id = ?", id)
}

export async function getSyncCursor(key: string): Promise<string | null> {
  const db = await initializeDatabase()
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = ?", key)
  return row?.value ?? null
}

export async function setSyncCursor(key: string, value: string): Promise<void> {
  const db = await initializeDatabase()
  await db.runAsync("INSERT INTO app_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, value)
}

export async function getCachedResource<T>(key: string): Promise<T | null> {
  const db = await initializeDatabase()
  const row = await db.getFirstAsync<{ payload_json: string }>("SELECT payload_json FROM cached_resources WHERE key = ?", key)
  if (!row) return null
  try {
    return JSON.parse(row.payload_json) as T
  } catch {
    return null
  }
}

export async function setCachedResource<T>(key: string, payload: T, updatedAt = new Date().toISOString()): Promise<void> {
  const db = await initializeDatabase()
  await db.runAsync(
    "INSERT INTO cached_resources (key, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at",
    key,
    JSON.stringify(payload),
    updatedAt,
  )
  await setSyncCursor(`resource:${key}`, updatedAt)
}
