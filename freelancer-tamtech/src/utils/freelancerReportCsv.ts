import type { FreelancerReportRow } from "../api/admin"

const HEADERS = [
  "Full Name",
  "Phone Number",
  "Created When",
  "Total Leads",
  "Quantity Sold",
  "Converted Sales",
  "Paid Commissions",
  "Total Paid (KES)",
]

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText
}

export function createFreelancerReportCsv(rows: FreelancerReportRow[]): string {
  const body = rows.map((row) => [
    row.full_name,
    row.mpesa_phone || "",
    row.created_at,
    row.total_leads ?? 0,
    row.quantity_sold ?? 0,
    row.converted_sales ?? 0,
    row.paid_commissions ?? 0,
    row.total_paid_kes ?? 0,
  ].map(csvCell).join(","))

  return `\uFEFF${HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`
}
