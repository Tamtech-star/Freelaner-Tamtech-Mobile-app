import type { LeadCardItem } from "../api/portal"

const HEADERS = [
  "Lead Code",
  "Customer Name",
  "Bike Model",
  "Payment Type",
  "Quantity",
  "Lead Status",
  "Created",
]

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText
}

export function createFreelancerLeadsCsv(rows: LeadCardItem[]): string {
  const body = rows.map((row) => [
    row.lead_code,
    row.customer_full_name,
    row.bike_model || "",
    row.payment_type,
    row.quantity_interested ?? 1,
    row.lead_status.replace(/_/g, " "),
    row.created_at,
  ].map(csvCell).join(","))

  return `\uFEFF${HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`
}
