import assert from "node:assert/strict"
import test from "node:test"
import { isSyncCursorStale } from "../src/offline/syncPolicy.ts"

test("missing sync cursor is stale", () => {
  assert.equal(isSyncCursorStale(null, "2026-08-14T12:00:00.000Z"), true)
})

test("recent sync cursor remains fresh within the cache window", () => {
  assert.equal(
    isSyncCursorStale("2026-08-14T11:55:00.000Z", "2026-08-14T12:00:00.000Z"),
    false,
  )
})

test("old sync cursor becomes stale after the cache window", () => {
  assert.equal(
    isSyncCursorStale("2026-08-14T11:40:00.000Z", "2026-08-14T12:00:00.000Z"),
    true,
  )
})
