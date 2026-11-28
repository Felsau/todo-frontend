import { ref } from 'vue'

/*
 * Date helpers. due_date stays a plain YYYY-MM-DD string everywhere.
 * Dates are always built from year/month/day parts in local time and are
 * never created with new Date('YYYY-MM-DD'), which would parse as UTC.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Same day n months later, kept inside the shorter month (31 Jan plus 1 month is 28 or 29 Feb). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(y, m - 1 + n + 1, 0).getDate()
  return toISO(new Date(y, m - 1 + n, Math.min(d, last)))
}

/** Last day of the month of iso. */
export function monthEnd(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return toISO(new Date(y, m, 0))
}

/** Whole days from a to b (b minus a), immune to DST shifts. */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

export function startOfWeek(iso: string): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() - d.getDay())
  return toISO(d)
}

/** Reactive "today", refreshed so the app survives midnight and long-lived tabs. */
export const today = ref(toISO(new Date()))

function refreshToday() {
  const now = toISO(new Date())
  if (now !== today.value) today.value = now
}
if (typeof window !== 'undefined') {
  window.setInterval(refreshToday, 30_000)
  document.addEventListener('visibilitychange', refreshToday)
}

const th = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('th-TH', o)
const fShort = th({ day: 'numeric', month: 'short' })
const fShortYear = th({ day: 'numeric', month: 'short', year: 'numeric' })
const fMonthYear = th({ month: 'long', year: 'numeric' })
const fWeekdayLong = th({ weekday: 'long' })
const fDayMonthLong = th({ day: 'numeric', month: 'long' })
const fFull = th({ day: 'numeric', month: 'long', year: 'numeric' })
const fStamp = th({
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const WEEKDAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** "27 พ.ย." (adds the Buddhist year when it is not the current year). */
export function shortDate(iso: string): string {
  const d = parseISO(iso)
  return d.getFullYear() === parseISO(today.value).getFullYear() ? fShort.format(d) : fShortYear.format(d)
}

/** "27 พ.ย. 2569", always with the Buddhist year (date field text). */
export function fullShortDate(iso: string): string {
  return fShortYear.format(parseISO(iso))
}

const fMonthShort = new Intl.DateTimeFormat('th-TH', { month: 'short' })
const fMonthShortYear = new Intl.DateTimeFormat('th-TH', { month: 'short', year: 'numeric' })

/**
 * Heading for the week strip: "พฤศจิกายน 2569", or both months when the week spans two,
 * "พ.ย. ถึง ธ.ค. 2569" and "ธ.ค. 2569 ถึง ม.ค. 2570" (QA round 2, R2-15).
 */
export function weekLabel(startIso: string): string {
  const a = parseISO(startIso)
  const b = parseISO(addDays(startIso, 6))
  if (a.getMonth() === b.getMonth()) return monthLabel(startIso)
  if (a.getFullYear() === b.getFullYear()) return `${fMonthShort.format(a)} ถึง ${fMonthShortYear.format(b)}`
  return `${fMonthShortYear.format(a)} ถึง ${fMonthShortYear.format(b)}`
}

/** "พฤศจิกายน 2569" */
export function monthLabel(iso: string): string {
  return fMonthYear.format(parseISO(iso))
}

/** "ศุกร์" without the leading "วัน" */
export function weekdayName(iso: string): string {
  return fWeekdayLong.format(parseISO(iso)).replace(/^วัน/, '')
}

/** "27 พฤศจิกายน" */
export function dayMonthLong(iso: string): string {
  return fDayMonthLong.format(parseISO(iso))
}

/** Header eyebrow, e.g. "ศุกร์ 27 พฤศจิกายน 2569" */
export function eyebrowDate(iso: string): string {
  return `${weekdayName(iso)} ${fFull.format(parseISO(iso))}`
}

/** "27 พ.ย. 2569 10:42" for created_at / updated_at timestamps. */
export function stamp(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? '' : fStamp.format(d)
}

export interface DueInfo {
  label: string
  overdue: boolean
}

export function dueInfo(due: string | null, done: boolean, todayISO: string): DueInfo | null {
  if (!due) return null
  const nice = shortDate(due)
  if (done) return { label: nice, overdue: false }
  const d = diffDays(todayISO, due)
  if (d < 0) return { label: `เลยกำหนด ${nice}`, overdue: true }
  if (d === 0) return { label: 'วันนี้', overdue: false }
  if (d === 1) return { label: 'พรุ่งนี้', overdue: false }
  return { label: nice, overdue: false }
}

/**
 * "เสร็จ 28 พ.ย." for the chip of a done card: the day it was ticked, not the day it was due
 * (QA round 4 recheck, N1). Null when the time is missing (older data): the card then shows its due chip.
 */
export function doneLabel(completedAt: string | null): string | null {
  if (!completedAt) return null
  const d = new Date(completedAt)
  return Number.isNaN(d.getTime()) ? null : `เสร็จ ${shortDate(toISO(d))}`
}

export function isOverdue(due: string | null, done: boolean, todayISO: string): boolean {
  return !done && !!due && due < todayISO
}

/**
 * A due date picked before today. The task is allowed (writing down old jobs is normal), but it
 * will show as overdue straight away, so the pickers say so first (QA round 3, UI 6).
 * Same test as isOverdue for a task that is not done.
 */
export function isPastDate(due: string | null, todayISO: string): boolean {
  return isOverdue(due, false, todayISO)
}

/** The red hint under a date picker when the chosen date has already passed. */
/** id of the hint line under the add form's date row (the date buttons point at it). */
export const PAST_HINT_ID = 'add-past-hint'
/** Add forms: the picked day has passed (round 6, N4: names the day, same rule everywhere). */
export const pastAddHint = (iso: string) => `วันที่ ${shortDate(iso)} ผ่านมาแล้ว งานที่เพิ่มจะขึ้นว่าเลยกำหนดทันที`
/** Task detail: a past day picked for this task; it may already be overdue. */
export const pastEditHint = (iso: string, alreadyOverdue: boolean) =>
  `วันที่ ${shortDate(iso)} ผ่านมาแล้ว ${alreadyOverdue ? 'งานนี้จะยังเลยกำหนดอยู่' : 'งานนี้จะขึ้นว่าเลยกำหนดทันที'}`

/** The four quick options of the shared due picker. */
export function dueOptions(todayISO: string): { value: string; label: string }[] {
  return [
    { value: todayISO, label: 'วันนี้' },
    { value: addDays(todayISO, 1), label: 'พรุ่งนี้' },
    { value: addDays(todayISO, 7), label: 'อีก 7 วัน' },
    { value: '', label: 'ไม่มีกำหนดส่ง' },
  ]
}

/** Text for a due chip: the quick-option label when it matches, otherwise the date. */
export function dueChipText(value: string, todayISO: string): string {
  if (!value) return 'ไม่มีกำหนดส่ง'
  const hit = dueOptions(todayISO).find((o) => o.value === value)
  return hit ? hit.label : shortDate(value)
}
