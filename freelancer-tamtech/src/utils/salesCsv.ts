import type { ConvertedSaleRow } from "../api/admin"
import type { SalesRecordItem } from "../api/salesRecord"

export type SalesCsvRow = Pick<
  ConvertedSaleRow | SalesRecordItem,
  | "conversion_code"
  | "submission_type"
  | "customer_name"
  | "freelancer_name"
  | "freight"
  | "sales_agent_name"
  | "sales_invoice_number"
  | "bike_model_sold"
  | "sale_date"
  | "quantity"
  | "commission_kes"
  | "paid_kes"
  | "payment_status"
  | "payment_type"
>

const HEADERS = [
  "Conversion Code",
  "Submission Type",
  "Customer Name",
  "Freelancer Name",
  "Freight",
  "Sales Agent",
  "Invoice Number",
  "Bike Model",
  "Sale Date",
  "Quantity",
  "Commission (KES)",
  "Paid (KES)",
  "Payment Status",
  "Payment Type",
]

function protectSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = protectSpreadsheetFormula(String(value))
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function displaySubmissionType(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function displayPaymentType(value: string | null | undefined): string {
  if (!value) return ""
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function createSalesCsv(rows: SalesCsvRow[]): string {
  const body = rows.map((row) => [
    row.conversion_code,
    displaySubmissionType(row.submission_type),
    row.customer_name,
    row.freelancer_name || "",
    row.freight,
    row.sales_agent_name,
    row.sales_invoice_number,
    row.bike_model_sold,
    row.sale_date,
    row.quantity,
    row.commission_kes,
    row.paid_kes,
    row.payment_status,
    displayPaymentType(row.payment_type),
  ].map(csvCell).join(","))

  return `\uFEFF${HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`
}

export function sanitizeCsvFileName(title: string, isoDate = new Date().toISOString()): string {
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sales"
  const date = isoDate.slice(0, 10)
  return `${safeTitle}-${date}.csv`
}
