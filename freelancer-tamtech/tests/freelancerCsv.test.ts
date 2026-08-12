import assert from "node:assert/strict"
import test from "node:test"
import { createFreelancersCsv } from "../src/utils/freelancerCsv.ts"

const freelancer = {
  id: "freelancer-1",
  freelancer_code: "FR-001",
  display_code: "TM-001",
  full_name: 'Jane "JJ", Kamau',
  email: "jane@example.com",
  mpesa_phone: "0712345678",
  registration_status: "approved",
  created_at: "2026-08-12T10:00:00.000Z",
}

test("createFreelancersCsv exports complete freelancer rows", () => {
  const csv = createFreelancersCsv([freelancer])

  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.match(csv, /Freelancer Code,Display Code,Full Name/)
  assert.match(csv, /"Jane ""JJ"", Kamau"/)
  assert.match(csv, /jane@example.com/)
  assert.match(csv, /0712345678/)
})

test("createFreelancersCsv protects formula-like cells", () => {
  const csv = createFreelancersCsv([{ ...freelancer, full_name: "=SUM(1,2)" }])

  assert.match(csv, /"'=SUM\(1,2\)"/)
})
