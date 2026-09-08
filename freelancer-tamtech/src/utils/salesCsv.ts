export type SalesCsvRow = {
  conversion_code: string
  submission_type: string
  customer_name: string
  freelancer_name?: string | null
  freight: string
  sales_agent_name: string
  sales_invoice_number: string
  bike_model_sold: string
  sale_date: string
  quantity: number
  commission_kes: string
  paid_kes: number
  payment_status: string
  payment_type?: string | null
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
  invoice_photo_url?: string | null
  agreement_photo_url?: string | null
  id_doc_url?: string | null
  kra_doc_url?: string | null
  bike_photo_url?: string | null
  chassis_photo_url?: string | null
}

const HEADERS = [
  "Submission Type",
  "Customer Name",
  "Freelancer Name",
  "Bike Model",
  "Sale Date",
  "Quantity",
  "Payment Type",
  "Customer Type",
  "Customer ID Number",
  "Customer Phone",
  "KRA PIN",
  "Bike Registration Number",
  "Chassis Number",
  "Finance Details",
  "Bike Color",
  "Insurance Type",
  "Tracker Duration",
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

function displayDateOnly(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match?.[0] || value
}

export function createSalesCsv(rows: SalesCsvRow[]): string {
  const body = rows.map((row) => [
    displaySubmissionType(row.submission_type),
    row.customer_name,
    row.freelancer_name || "",
    row.bike_model_sold,
    displayDateOnly(row.sale_date),
    row.quantity,
    displayPaymentType(row.payment_type),
    displayPaymentType(row.customer_type),
    row.customer_id_number,
    row.customer_phone,
    row.kra_pin,
    row.bike_registration_number,
    row.chassis_number,
    row.finance_details,
    row.bike_color,
    row.insurance_type,
    row.tracker_duration,
  ].map(csvCell).join(","))

  return `\uFEFF${HEADERS.map(csvCell).join(",")}\r\n${body.join("\r\n")}${body.length ? "\r\n" : ""}`
}

export function sanitizeCsvFileName(title: string, isoDate = new Date().toISOString()): string {
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sales"
  const date = isoDate.slice(0, 10)
  return `${safeTitle}-${date}.csv`
}
