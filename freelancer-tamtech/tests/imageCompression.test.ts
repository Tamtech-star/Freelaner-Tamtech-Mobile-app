import assert from "node:assert/strict"
import test from "node:test"
import { getCompressionQualities, shouldCompressImage } from "../src/utils/imageCompressionPolicy.ts"

test("compression policy processes common camera image types", () => {
  assert.equal(shouldCompressImage("image/jpeg"), true)
  assert.equal(shouldCompressImage("image/png"), true)
  assert.equal(shouldCompressImage("image/webp"), true)
  assert.equal(shouldCompressImage("application/pdf"), false)
})

test("compression policy progressively lowers JPEG quality", () => {
  assert.deepEqual(getCompressionQualities(), [0.72, 0.58, 0.44, 0.32])
})
