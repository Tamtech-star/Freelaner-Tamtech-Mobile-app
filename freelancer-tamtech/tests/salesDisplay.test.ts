import assert from "node:assert/strict"
import test from "node:test"
import {
  enrichSalesDisplayFields,
  formatPaymentMode,
  getFreelancerCardName,
  getFreelancerName,
} from "../src/utils/salesDisplay"

const baseSale = {
  id: "lead-1",
  conversion_code: "LED-001",
  submission_type: "freelancer_lead",
  freight: "Legacy Freelancer",
}

test("enriches freelancer sales from their linked lead", () => {
  const [sale] = enrichSalesDisplayFields([baseSale], [
    {
      id: "lead-1",
      lead_code: "LED-001",
      payment_type: "loan",
      freelancers: { full_name: "Jane Freelancer" },
    },
  ])

  assert.equal(sale.freelancer_name, "Jane Freelancer")
  assert.equal(sale.payment_type, "loan")
})

test("preserves fields already returned by the sales endpoint", () => {
  const [sale] = enrichSalesDisplayFields(
    [{ ...baseSale, freelancer_name: "API Freelancer", payment_type: "cash" }],
    [{ ...baseSale, lead_code: "LED-001", payment_type: "loan", freelancers: { full_name: "Lead Freelancer" } }],
  )

  assert.equal(sale.freelancer_name, "API Freelancer")
  assert.equal(sale.payment_type, "cash")
})

test("uses legacy freight only as the freelancer-name fallback", () => {
  assert.equal(getFreelancerName(baseSale), "Legacy Freelancer")
  assert.equal(getFreelancerName({ ...baseSale, submission_type: "direct_sale", freight: "Nairobi" }), "N/A")
})

test("shows a freelancer name on freelancer-lead cards only", () => {
  assert.equal(getFreelancerCardName({ ...baseSale, freelancer_name: "Jane Freelancer" }), "Jane Freelancer")
  assert.equal(getFreelancerCardName(baseSale), "Legacy Freelancer")
  assert.equal(getFreelancerCardName({ ...baseSale, submission_type: "direct_sale" }), null)
  assert.equal(getFreelancerCardName({ ...baseSale, freight: "—" }), null)
})

test("formats cash and loan modes for display and handles missing values", () => {
  assert.equal(formatPaymentMode("cash"), "Cash")
  assert.equal(formatPaymentMode("LOAN"), "Loan")
  assert.equal(formatPaymentMode(null), "N/A")
})
