import assert from "node:assert/strict"
import test from "node:test"
import {
  buildPendingSalesRecord,
  getSuccessfullySyncedIds,
  shouldRunRemoteSync,
} from "../src/offline/syncCore.ts"

const fields = {
  submissionType: "direct_sale",
  salesAgentName: "Mary Agent",
  customerFullName: "John Kamau",
  customerLocation: "Nairobi",
  bikeModel: "EKON450M1V2",
  invoiceNumber: "INV-200",
  saleDate: "2026-08-12",
  quantity: "2",
  paymentType: "cash",
}

test("buildPendingSalesRecord creates a renderable pending local sale", () => {
  const record = buildPendingSalesRecord("local-123", fields, "2026-08-12T10:00:00.000Z")

  assert.equal(record.id, "local-123")
  assert.equal(record.conversion_code, "LOCAL-123")
  assert.equal(record.customer_name, "John Kamau")
  assert.equal(record.quantity, 2)
  assert.equal(record.payment_status, "pending")
  assert.equal(record.sync_status, "pending")
  assert.equal(record.updated_at, "2026-08-12T10:00:00.000Z")
})

test("buildPendingSalesRecord sanitizes invalid quantities", () => {
  const record = buildPendingSalesRecord(
    "local-invalid",
    { ...fields, quantity: "not-a-number" },
    "2026-08-12T10:00:00.000Z",
  )

  assert.equal(record.quantity, 1)
})

test("remote sync only runs when the network is reachable", () => {
  assert.equal(shouldRunRemoteSync({ isConnected: true, isInternetReachable: true }), true)
  assert.equal(shouldRunRemoteSync({ isConnected: true, isInternetReachable: null }), true)
  assert.equal(shouldRunRemoteSync({ isConnected: false, isInternetReachable: true }), false)
  assert.equal(shouldRunRemoteSync({ isConnected: true, isInternetReachable: false }), false)
})

test("successful queue IDs exclude rejected pushes", () => {
  const ids = getSuccessfullySyncedIds([
    { id: "queue-1", ok: true },
    { id: "queue-2", ok: false },
    { id: "queue-3", ok: true },
  ])

  assert.deepEqual(ids, ["queue-1", "queue-3"])
})
