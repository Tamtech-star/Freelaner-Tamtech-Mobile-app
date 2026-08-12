import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const databaseSource = readFileSync(new URL("../src/offline/database.ts", import.meta.url), "utf8")

function countSqlListItems(value: string): number {
  return value.split(",").map((item) => item.trim()).filter(Boolean).length
}

test("sales INSERT statements bind exactly one value per column", () => {
  const matches = [...databaseSource.matchAll(/INSERT INTO sales_records \(([^)]+)\)\s*VALUES \(([^)]+)\)/g)]

  assert.equal(matches.length, 2)
  for (const match of matches) {
    const columnCount = countSqlListItems(match[1])
    const placeholderCount = (match[2].match(/\?/g) || []).length
    assert.equal(placeholderCount, columnCount)
    assert.equal(columnCount, 24)
  }
})

test("salesParams returns the same number of bound values", () => {
  const match = databaseSource.match(/function salesParams[\s\S]*?return \[([\s\S]*?)\n  \]/)
  assert.ok(match)

  const rowReferences = match[1].match(/row\.[a-z_]+/g) || []
  assert.equal(rowReferences.length, 24)
})
