import assert from "node:assert/strict"
import test from "node:test"
import { createSalesCsv, sanitizeCsvFileName } from "../src/utils/salesCsv.ts"

const sale = {
  conversion_code: "CNV-001",
  submission_type: "direct_sale",
  customer_name: 'Jane "JJ", Kamau',
  freelancer_name: null,
  freight: "Nairobi",
  sales_agent_name: "Mary Agent",
  sales_invoice_number: "INV-200",
  bike_model_sold: "EKON450M1V2",
  sale_date: "2026-08-12T14:35:22.000Z",
  quantity: 2,
  commission_kes: "N/A",
  paid_kes: 0,
  payment_status: "approved",
  payment_type: "cash",
  customer_type: "individual",
  customer_id_number: "12345678",
  customer_phone: "0712345678",
  kra_pin: "A001234567B",
  customer_location: "Embakasi",
  bike_registration_number: "KMEV 001A",
  chassis_number: "CHASSIS-001",
  finance_details: "Paid in full",
  bike_color: "Blue",
  has_insurance: true,
  insurance_type: "TPO PRIVATE",
  has_tracker: true,
  tracker_duration: "Yearly",
  referral_name: "John Referrer",
  deployment_name: "Nairobi Deployment",
  invoice_photo_url: "https://example.test/invoice.jpg",
  agreement_photo_url: "https://example.test/agreement.jpg",
  id_doc_url: "https://example.test/id.jpg",
  kra_doc_url: "https://example.test/kra.jpg",
  bike_photo_url: "https://example.test/bike.jpg",
  chassis_photo_url: "https://example.test/chassis.jpg",
}

test("createSalesCsv exports headers and safely escapes spreadsheet values", () => {
  const csv = createSalesCsv([sale])

  assert.match(csv, /^\uFEFFConversion Code,Submission Type,Customer Name/)
  assert.match(csv, /"Jane ""JJ"", Kamau"/)
  assert.match(csv, /Direct Sale/)
  assert.match(csv, /Cash/)
  assert.match(csv, /Customer Type,Customer ID Number,Customer Phone,KRA PIN,Customer Location/)
  assert.match(csv, /Bike Registration Number,Chassis Number,Finance Details,Bike Color/)
  assert.match(csv, /Insurance Type,Tracker Duration/)
  assert.doesNotMatch(csv, /Has Insurance/)
  assert.doesNotMatch(csv, /Has Tracker/)
  assert.match(csv, /Invoice Photo URL,Sales Agreement URL,ID Document URL,KRA Document URL,Bike Photo URL,Chassis Photo URL/)
  assert.match(csv, /12345678,0712345678,A001234567B,Embakasi/)
  assert.match(csv, /https:\/\/example\.test\/chassis\.jpg/)
  assert.doesNotMatch(csv, /Freight/)
  assert.doesNotMatch(csv, /2026-08-12T14:35:22\.000Z/)
  assert.match(csv, /2026-08-12/)
})

test("createSalesCsv protects formula-like values", () => {
  const csv = createSalesCsv([{ ...sale, customer_name: "=SUM(1,2)" }])

  assert.match(csv, /"'=SUM\(1,2\)"/)
})

test("sanitizeCsvFileName creates a safe dated CSV name", () => {
  assert.equal(
    sanitizeCsvFileName("Freelancer Lead Sales", "2026-08-12T10:00:00.000Z"),
    "freelancer-lead-sales-2026-08-12.csv",
  )
})
