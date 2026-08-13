export type SalesDateFilterMode = "all" | "day" | "week" | "months"

export type SalesDateFilter = {
  mode: SalesDateFilterMode
  day: string
  weekStart: string
  weekEnd: string
  months: string[]
}

export const DEFAULT_SALES_DATE_FILTER: SalesDateFilter = {
  mode: "all",
  day: "",
  weekStart: "",
  weekEnd: "",
  months: [],
}

export type CalendarMonth = { key: string; label: string; year: string }
export type CalendarWeek = { start: string; end: string; label: string }

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function buildCalendarMonths(years: string[]): CalendarMonth[] {
  return [...years].sort().flatMap((year) =>
    MONTH_NAMES.map((label, index) => ({
      key: `${year}-${String(index + 1).padStart(2, "0")}`,
      label,
      year,
    })),
  )
}

export function buildWeeksForMonth(monthKey: string): CalendarWeek[] {
  const [year, month] = monthKey.split("-").map(Number)
  if (!year || !month || month < 1 || month > 12) return []
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthName = MONTH_NAMES[month - 1]
  const weeks: CalendarWeek[] = []
  for (let startDay = 1, index = 1; startDay <= daysInMonth; startDay += 7, index += 1) {
    const endDay = Math.min(startDay + 6, daysInMonth)
    weeks.push({
      start: `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`,
      end: `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
      label: `Week ${index}: ${startDay}–${endDay} ${monthName} ${year}`,
    })
  }
  return weeks
}

function dateKey(value: string): string {
  return value.slice(0, 10)
}

function monthKey(value: string): string {
  return value.slice(0, 7)
}

function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split("-").map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + amount))
  return result.toISOString().slice(0, 10)
}

export function applySalesDateFilter<T extends { sale_date: string }>(rows: T[], filter: SalesDateFilter): T[] {
  if (filter.mode === "all") return rows
  if (filter.mode === "day") return filter.day ? rows.filter((row) => dateKey(row.sale_date) === filter.day) : rows
  if (filter.mode === "months") {
    if (filter.months.length === 0) return rows
    return rows.filter((row) => filter.months.includes(monthKey(row.sale_date)))
  }
  if (!filter.weekStart) return rows
  const weekEnd = filter.weekEnd || addDays(filter.weekStart, 6)
  return rows.filter((row) => {
    const day = dateKey(row.sale_date)
    return day >= filter.weekStart && day <= weekEnd
  })
}

export function formatDateFilterLabel(filter: SalesDateFilter): string {
  if (filter.mode === "day") return filter.day || "Choose a day"
  if (filter.mode === "week") return filter.weekStart ? `Week of ${filter.weekStart}` : "Choose week start"
  if (filter.mode === "months") return filter.months.length ? `${filter.months.length} month(s)` : "Choose months"
  return "All dates"
}
