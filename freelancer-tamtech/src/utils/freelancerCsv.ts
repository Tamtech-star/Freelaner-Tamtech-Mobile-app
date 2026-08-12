import type { FreelancerRow } from "../api/admin"

const HEADERS = [
  "Freelancer Code",
  "Display Code",
  "Full Name",
  "Email",
  "M-Pesa Phone",
  "Registration Status",
  "Created At",
]

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText
}

export function createFreelancersCsv(rows: FreelancerRow[]): string {
  const body = rows.map((row) => [
    row.freelancer_code,
    row.display_code || "",
    row.full_name,
    row.email,
    row.mpesa_phone || "",
    row.registration_status,
    row.created_at,
  ].map(csvCell).join(","))

  return `\uFEFF${HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`
}
