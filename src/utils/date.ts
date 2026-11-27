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

export function isOverdue(due: string | null, done: boolean, todayISO: string): boolean {
  return !done && !!due && due < todayISO
}

/** The four quick options of the shared due picker. */
export function dueOptions(todayISO: string): { value: string; label: string }[] {
  return [
    { value: todayISO, label: 'วันนี้' },
    { value: addDays(todayISO, 1), label: 'พรุ่งนี้' },
    { value: addDays(todayISO, 7), label: 'อีก 7 วัน' },
    { value: '', label: 'ไม่มีกำหนด' },
  ]
}

/** Text for a due chip: the quick-option label when it matches, otherwise the date. */
export function dueChipText(value: string, todayISO: string): string {
  if (!value) return 'ไม่มีกำหนด'
  const hit = dueOptions(todayISO).find((o) => o.value === value)
  return hit ? hit.label : shortDate(value)
}
