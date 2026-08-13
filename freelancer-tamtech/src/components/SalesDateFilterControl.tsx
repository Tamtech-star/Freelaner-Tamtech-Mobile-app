import { useMemo, useState } from "react"
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react-native"
import { Calendar, type DateData } from "react-native-calendars"
import {
  buildCalendarMonths,
  buildWeeksForMonth,
  DEFAULT_SALES_DATE_FILTER,
  formatDateFilterLabel,
  type SalesDateFilter,
  type SalesDateFilterMode,
} from "../utils/salesDateFilter"

type Props = {
  value: SalesDateFilter
  onChange: (value: SalesDateFilter) => void
  availableDates: string[]
}

const MODES: Array<{ value: SalesDateFilterMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "months", label: "Months" },
]

const CALENDAR_THEME = {
  todayTextColor: "#2563eb",
  selectedDayBackgroundColor: "#2563eb",
  selectedDayTextColor: "#ffffff",
  arrowColor: "#2563eb",
  monthTextColor: "#0f172a",
  textMonthFontWeight: "700" as const,
  textDayHeaderFontWeight: "600" as const,
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

function fullYearRange(availableDates: string[]): string[] {
  const currentYear = new Date().getFullYear()
  const years = availableDates.map((date) => Number(date.slice(0, 4))).filter(Number.isFinite)
  const minimum = Math.min(currentYear - 5, ...years)
  const maximum = Math.max(currentYear + 2, ...years)
  return Array.from({ length: maximum - minimum + 1 }, (_, index) => String(minimum + index))
}

export function SalesDateFilterControl({ value, onChange, availableDates }: Props) {
  const [open, setOpen] = useState(false)
  const [weekMonth, setWeekMonth] = useState(value.weekStart.slice(0, 7) || currentMonthKey())
  const [monthsYear, setMonthsYear] = useState(Number(value.months[0]?.slice(0, 4)) || new Date().getFullYear())
  const years = useMemo(() => fullYearRange(availableDates), [availableDates])
  const calendarMonths = useMemo(() => buildCalendarMonths([String(monthsYear)]), [monthsYear])
  const weeks = useMemo(() => buildWeeksForMonth(weekMonth), [weekMonth])

  const selectMode = (mode: SalesDateFilterMode) => onChange({ ...value, mode })
  const selectDay = (day: DateData) => onChange({ ...value, mode: "day", day: day.dateString })
  const selectWeek = (start: string, end: string) => onChange({ ...value, mode: "week", weekStart: start, weekEnd: end })
  const toggleMonth = (month: string) => {
    const selected = value.months.includes(month)
    onChange({ ...value, mode: "months", months: selected ? value.months.filter((item) => item !== month) : [...value.months, month] })
  }

  const changeWeekMonth = (amount: number) => {
    const [year, month] = weekMonth.split("-").map(Number)
    const next = new Date(Date.UTC(year, month - 1 + amount, 1))
    setWeekMonth(next.toISOString().slice(0, 7))
  }

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)}>
        <CalendarDays size={17} color="#2563eb" />
        <Text style={s.triggerText}>{formatDateFilterLabel(value)}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.headingRow}>
              <View>
                <Text style={s.title}>Sales date filter</Text>
                <Text style={s.subtitle}>Choose from the calendar—no manual date entry.</Text>
              </View>
              <TouchableOpacity style={s.closeButton} onPress={() => setOpen(false)}><Text style={s.closeText}>Done</Text></TouchableOpacity>
            </View>

            <View style={s.modeRow}>
              {MODES.map((mode) => (
                <TouchableOpacity key={mode.value} style={[s.modeButton, value.mode === mode.value && s.modeButtonActive]} onPress={() => selectMode(mode.value)}>
                  <Text style={[s.modeText, value.mode === mode.value && s.modeTextActive]}>{mode.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView contentContainerStyle={s.body}>
              {value.mode === "all" && <Text style={s.help}>All sales records are included.</Text>}

              {value.mode === "day" && (
                <Calendar
                  current={value.day || undefined}
                  enableSwipeMonths
                  onDayPress={selectDay}
                  markedDates={value.day ? { [value.day]: { selected: true } } : {}}
                  theme={CALENDAR_THEME}
                />
              )}

              {value.mode === "week" && (
                <>
                  <View style={s.navigator}>
                    <TouchableOpacity style={s.navButton} onPress={() => changeWeekMonth(-1)}><ChevronLeft size={20} color="#2563eb" /></TouchableOpacity>
                    <Text style={s.navigatorTitle}>{new Date(`${weekMonth}-01T00:00:00`).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</Text>
                    <TouchableOpacity style={s.navButton} onPress={() => changeWeekMonth(1)}><ChevronRight size={20} color="#2563eb" /></TouchableOpacity>
                  </View>
                  {weeks.map((week) => {
                    const selected = value.weekStart === week.start && value.weekEnd === week.end
                    return (
                      <TouchableOpacity key={week.start} style={[s.weekRow, selected && s.weekRowActive]} onPress={() => selectWeek(week.start, week.end)}>
                        <CalendarDays size={18} color={selected ? "#ffffff" : "#2563eb"} />
                        <Text style={[s.weekText, selected && s.weekTextActive]}>{week.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </>
              )}

              {value.mode === "months" && (
                <>
                  <View style={s.navigator}>
                    <TouchableOpacity style={s.navButton} onPress={() => setMonthsYear((year) => year - 1)}><ChevronLeft size={20} color="#2563eb" /></TouchableOpacity>
                    <Text style={s.navigatorTitle}>{monthsYear}</Text>
                    <TouchableOpacity style={s.navButton} onPress={() => setMonthsYear((year) => year + 1)}><ChevronRight size={20} color="#2563eb" /></TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.yearRow}>
                    {years.map((year) => (
                      <TouchableOpacity key={year} style={[s.yearChip, String(monthsYear) === year && s.yearChipActive]} onPress={() => setMonthsYear(Number(year))}>
                        <Text style={[s.yearText, String(monthsYear) === year && s.yearTextActive]}>{year}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={s.monthGrid}>
                    {calendarMonths.map((month) => {
                      const selected = value.months.includes(month.key)
                      return (
                        <TouchableOpacity key={month.key} style={[s.monthCard, selected && s.monthCardActive]} onPress={() => toggleMonth(month.key)}>
                          <View style={[s.checkbox, selected && s.checkboxActive]}>{selected && <Check size={14} color="#fff" />}</View>
                          <Text style={[s.monthText, selected && s.monthTextActive]}>{month.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={s.clearButton} onPress={() => onChange(DEFAULT_SALES_DATE_FILTER)}><Text style={s.clearText}>Clear date filter</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  trigger: { height: 42, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, backgroundColor: "#eff6ff", paddingHorizontal: 12 },
  triggerText: { color: "#1d4ed8", fontSize: 13, fontWeight: "600" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: { height: "88%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  subtitle: { marginTop: 2, fontSize: 11, color: "#64748b" },
  closeButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#2563eb" },
  closeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  modeRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  modeButton: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8, backgroundColor: "#f1f5f9" },
  modeButtonActive: { backgroundColor: "#dbeafe" },
  modeText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  modeTextActive: { color: "#1d4ed8" },
  body: { paddingBottom: 18 },
  help: { padding: 14, fontSize: 13, color: "#64748b", textAlign: "center" },
  navigator: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  navigatorTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  navButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "#eff6ff" },
  weekRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#f8fafc", marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  weekRowActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  weekText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  weekTextActive: { color: "#fff" },
  yearRow: { gap: 8, paddingBottom: 12 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f1f5f9" },
  yearChipActive: { backgroundColor: "#2563eb" },
  yearText: { color: "#64748b", fontWeight: "600" },
  yearTextActive: { color: "#fff" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthCard: { width: "31%", minHeight: 58, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  monthCardActive: { backgroundColor: "#dbeafe", borderColor: "#2563eb" },
  checkbox: { position: "absolute", top: 5, right: 5, width: 19, height: 19, alignItems: "center", justifyContent: "center", borderRadius: 4, borderWidth: 1, borderColor: "#cbd5e1" },
  checkboxActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  monthText: { color: "#334155", fontSize: 12, fontWeight: "600" },
  monthTextActive: { color: "#1d4ed8" },
  clearButton: { alignItems: "center", marginTop: 10, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  clearText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },
})
