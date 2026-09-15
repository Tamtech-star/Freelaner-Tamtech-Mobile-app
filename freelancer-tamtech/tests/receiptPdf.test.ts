import assert from "node:assert/strict"
import test from "node:test"
import {
  buildReceiptFileName,
  decodeReceiptErrorMessage,
  normalizeReceiptPaymentCode,
  toReceiptBytes,
  utf8Decode,
  utf8Encode,
} from "../src/utils/receiptPdf.ts"

test("buildReceiptFileName mirrors the server Content-Disposition name", () => {
  assert.equal(buildReceiptFileName("PAY-1777725725568"), "payment-receipt-PAY-1777725725568.pdf")
  assert.equal(buildReceiptFileName(" pay-100 "), "payment-receipt-PAY-100.pdf")
})

test("buildReceiptFileName neutralises path traversal and empty codes", () => {
  assert.equal(buildReceiptFileName("../../etc/passwd"), "payment-receipt-ETC-PASSWD.pdf")
  assert.equal(buildReceiptFileName("PAY/../1"), "payment-receipt-PAY-1.pdf")
  assert.equal(buildReceiptFileName("PAY 1"), "payment-receipt-PAY-1.pdf")
  assert.equal(buildReceiptFileName(".."), "payment-receipt-payment.pdf")
  assert.equal(buildReceiptFileName("-PAY-1-"), "payment-receipt-PAY-1.pdf")
  assert.equal(buildReceiptFileName(""), "payment-receipt-payment.pdf")
  assert.equal(buildReceiptFileName("   "), "payment-receipt-payment.pdf")

  for (const input of ["../../etc/passwd", "PAY/../1", "C:\\temp\\x", "a/b/c"]) {
    const name = buildReceiptFileName(input)
    assert.doesNotMatch(name, /[/\\]/, `${input} kept a path separator`)
    assert.doesNotMatch(name, /\.\./, `${input} kept a parent-directory segment`)
  }
})

test("normalizeReceiptPaymentCode trims and upper-cases", () => {
  assert.equal(normalizeReceiptPaymentCode(" pay-1 "), "PAY-1")
  assert.equal(normalizeReceiptPaymentCode(""), "")
})

test("toReceiptBytes preserves PDF bytes for every transport shape", () => {
  const pdfBytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4

  assert.deepEqual(Array.from(toReceiptBytes(pdfBytes)), Array.from(pdfBytes))
  assert.deepEqual(Array.from(toReceiptBytes(pdfBytes.buffer.slice(0))), Array.from(pdfBytes))
  assert.deepEqual(Array.from(toReceiptBytes(new DataView(pdfBytes.buffer))), Array.from(pdfBytes))
  assert.deepEqual(Array.from(toReceiptBytes([0x25, 0x50, 0x44, 0x46])), [0x25, 0x50, 0x44, 0x46])
})

test("toReceiptBytes honours a typed-array view offset", () => {
  const backing = Uint8Array.from([0x00, 0x25, 0x50, 0x44, 0x46, 0x00])
  const view = new Uint8Array(backing.buffer, 1, 4)

  assert.deepEqual(Array.from(toReceiptBytes(view)), [0x25, 0x50, 0x44, 0x46])
})

test("toReceiptBytes rejects unexpected payloads", () => {
  assert.throws(() => toReceiptBytes(null), /Unexpected payment receipt payload/)
  assert.throws(() => toReceiptBytes({}), /Unexpected payment receipt payload/)
})

test("utf8Decode round-trips utf8Encode", () => {
  const original = "Tamttech receipt — KES 1,000 ✓"
  assert.equal(utf8Decode(utf8Encode(original)), original)
  assert.deepEqual(Array.from(utf8Encode("A")), [0x41])
})

test("decodeReceiptErrorMessage reads the JSON error out of raw bytes", () => {
  const body = utf8Encode('{"error":"Payment not found."}')

  assert.equal(decodeReceiptErrorMessage(body), "Payment not found.")
  assert.equal(decodeReceiptErrorMessage('{"error":"Payment not found."}'), "Payment not found.")
  assert.equal(decodeReceiptErrorMessage(utf8Encode('{"message":"Failed to generate receipt."}')), "Failed to generate receipt.")
})

test("decodeReceiptErrorMessage ignores non-JSON and byte-less bodies", () => {
  assert.equal(decodeReceiptErrorMessage(null), null)
  assert.equal(decodeReceiptErrorMessage(utf8Encode("<!DOCTYPE html>")), null)
  assert.equal(decodeReceiptErrorMessage(utf8Encode('{"error":"   "}')), null)
  assert.equal(decodeReceiptErrorMessage(utf8Encode("not json at all")), null)
})
