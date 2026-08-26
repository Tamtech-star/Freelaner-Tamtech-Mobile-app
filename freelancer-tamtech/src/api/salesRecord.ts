import api from './client'
import { getLocalSalesRecords, upsertSalesRecords } from '../offline/database'
import { runSyncWorker, runSyncWorkerIfStale } from '../offline/syncWorker'

//  Types 
export interface SalesRecordItem {
  id: string
  conversion_code: string
  submission_type: 'direct_sale' | 'freelancer_lead'
  customer_name: string
  freight: string
  sales_agent_name: string
  sales_invoice_number: string
  bike_model_sold: string
  sale_date: string
  quantity: number
  commission_kes: string
  paid_kes: number
  payment_status: string
  freelancer_name?: string | null
  payment_type?: string | null
  invoice_photo_url?: string | null
  agreement_photo_url?: string | null
  id_doc_url?: string | null
  kra_doc_url?: string | null
  bike_photo_url?: string | null
  chassis_photo_url?: string | null
  customer_type?: string | null
  customer_id_number?: string | null
  customer_phone?: string | null
  kra_pin?: string | null
  customer_location?: string | null
  bike_registration_number?: string | null
  chassis_number?: string | null
  finance_details?: string | null
  bike_color?: string | null
  has_insurance?: boolean | null
  insurance_type?: string | null
  has_tracker?: boolean | null
  tracker_duration?: string | null
  referral_name?: string | null
  deployment_name?: string | null
}

export interface SalesHistoryResponse {
  items: SalesRecordItem[]
}

export interface SubmitSalesResponse {
  ok: boolean
  conversionCode: string
  submissionType: string
}

// Fetch sales history 
export async function fetchSalesHistory(): Promise<SalesRecordItem[]> {
  const response = await api.get<SalesHistoryResponse>('/sales-record/history')
  return response.data.items || []
}

export async function getSalesHistoryLocalFirst(): Promise<SalesRecordItem[]> {
  const cached = await getLocalSalesRecords()
  void runSyncWorkerIfStale().catch(() => undefined)
  return cached
}

export async function syncSalesHistoryNow(): Promise<SalesRecordItem[]> {
  await runSyncWorker()
  return getLocalSalesRecords()
}

export async function refreshSalesHistoryCache(): Promise<SalesRecordItem[]> {
  const items = await fetchSalesHistory()
  await upsertSalesRecords(items)
  return items
}

//  Submit new sales record 

export async function submitSalesRecord(
  formData: FormData
): Promise<SubmitSalesResponse> {
  // React Native supplies the multipart header and generated boundary.
  const response = await api.post<SubmitSalesResponse>('/sales-record', formData)
  return response.data
}