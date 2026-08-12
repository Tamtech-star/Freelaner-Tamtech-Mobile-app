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
  sale_date: "2026-08-12",
  quantity: 2,
  commission_kes: "N/A",
  paid_kes: 0,
  payment_status: "approved",
  payment_type: "cash",
}

test("createSalesCsv exports headers and safely escapes spreadsheet values", () => {
  const csv = createSalesCsv([sale])

  assert.match(csv, /^\uFEFFConversion Code,Submission Type,Customer Name/)
  assert.match(csv, /"Jane ""JJ"", Kamau"/)
  assert.match(csv, /Direct Sale/)
  assert.match(csv, /Cash/)
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
