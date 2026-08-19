import type { SalesRecordItem } from "../api/salesRecord"

export type PendingSalesFields = {
  submissionType: string
  salesAgentName: string
  customerFullName: string
  customerLocation: string
  bikeModel: string
  invoiceNumber: string
  saleDate: string
  quantity: string
  paymentType: string
  localDocuments?: Partial<Pick<SalesRecordItem, "invoice_photo_url" | "agreement_photo_url" | "id_doc_url" | "kra_doc_url" | "bike_photo_url" | "chassis_photo_url">>
}

export type PendingSalesRecord = SalesRecordItem & {
  sync_status: "pending"
  updated_at: string
  payload_json: string
}

export function buildPendingSalesRecord(
  id: string,
  fields: PendingSalesFields,
  updatedAt: string,
): PendingSalesRecord {
  const quantity = Number.parseInt(fields.quantity, 10)
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  const suffix = id.replace(/^local-/i, "").replace(/[^a-zA-Z0-9]/g, "").slice(-12).toUpperCase()
  const conversionCode = `LOCAL-${suffix}`

  return {
    id,
    conversion_code: conversionCode,
    submission_type: fields.submissionType as SalesRecordItem["submission_type"],
    customer_name: fields.customerFullName,
    freight: "—",
    sales_agent_name: fields.salesAgentName,
    sales_invoice_number: fields.invoiceNumber || "—",
    bike_model_sold: fields.bikeModel,
    sale_date: fields.saleDate,
    quantity: safeQuantity,
    commission_kes: "Pending",
    paid_kes: 0,
    payment_status: "pending",
    freelancer_name: null,
    payment_type: fields.paymentType || null,
    invoice_photo_url: fields.localDocuments?.invoice_photo_url ?? null,
    agreement_photo_url: fields.localDocuments?.agreement_photo_url ?? null,
    id_doc_url: fields.localDocuments?.id_doc_url ?? null,
    kra_doc_url: fields.localDocuments?.kra_doc_url ?? null,
    bike_photo_url: fields.localDocuments?.bike_photo_url ?? null,
    chassis_photo_url: fields.localDocuments?.chassis_photo_url ?? null,
    sync_status: "pending",
    updated_at: updatedAt,
    payload_json: JSON.stringify(fields),
  }
}

export function shouldRunRemoteSync(state: {
  isConnected: boolean | null
  isInternetReachable: boolean | null
}): boolean {
  return state.isConnected === true && state.isInternetReachable !== false
}

export function getSuccessfullySyncedIds(results: Array<{ id: string; ok: boolean }>): string[] {
  return results.filter((result) => result.ok).map((result) => result.id)
}
