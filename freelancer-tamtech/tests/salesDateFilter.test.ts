import assert from "node:assert/strict"
import test from "node:test"
import {
  applySalesDateFilter,
  buildCalendarMonths,
  buildWeeksForMonth,
  type SalesDateFilter,
} from "../src/utils/salesDateFilter.ts"

const sales = [
  { id: "may", sale_date: "2026-05-31T10:00:00.000Z" },
  { id: "jun-1", sale_date: "2026-06-01T10:00:00.000Z" },
  { id: "jun-8", sale_date: "2026-06-08T10:00:00.000Z" },
  { id: "jul", sale_date: "2026-07-15T10:00:00.000Z" },
  { id: "aug", sale_date: "2026-08-20T10:00:00.000Z" },
]

function ids(filter: SalesDateFilter): string[] {
  return applySalesDateFilter(sales, filter).map((sale) => sale.id)
}

test("filters sales for one exact day", () => {
  assert.deepEqual(ids({ mode: "day", day: "2026-06-08", months: [], weekStart: "", weekEnd: "" }), ["jun-8"])
})

test("filters sales for the seven-day week beginning at weekStart", () => {
  assert.deepEqual(ids({ mode: "week", day: "", months: [], weekStart: "2026-06-01", weekEnd: "2026-06-07" }), ["jun-1"])
})

test("filters sales across multiple selected months", () => {
  assert.deepEqual(ids({ mode: "months", day: "", months: ["2026-06", "2026-08"], weekStart: "", weekEnd: "" }), ["jun-1", "jun-8", "aug"])
})

test("builds all twelve calendar months for every selectable year", () => {
  const months = buildCalendarMonths(["2025", "2026"])

  assert.equal(months.length, 24)
  assert.equal(months[0].key, "2025-01")
  assert.equal(months[11].key, "2025-12")
  assert.equal(months[23].key, "2026-12")
})

test("names every partial or complete week in the selected month", () => {
  const weeks = buildWeeksForMonth("2026-06")

  assert.deepEqual(weeks.map((week) => week.label), [
    "Week 1: 1–7 June 2026",
    "Week 2: 8–14 June 2026",
    "Week 3: 15–21 June 2026",
    "Week 4: 22–28 June 2026",
    "Week 5: 29–30 June 2026",
  ])
  assert.equal(weeks[4].start, "2026-06-29")
  assert.equal(weeks[4].end, "2026-06-30")
})
