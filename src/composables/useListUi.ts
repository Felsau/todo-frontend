import { computed, ref } from 'vue'
import { PRIORITY_LABEL, PRIORITY_RANK, type FilterKey, type SortKey, type Todo } from '../types'
import { addDays, isOverdue, toISO, today } from '../utils/date'
import { useTodos } from './useTodos'

/* Filter, search and sort state of the list view. All of it runs in the browser. */

const filter = ref<FilterKey>('all')
const query = ref('')
const sort = ref<SortKey>('due')
const searchOpen = ref(false)

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'active', label: 'ยังไม่เสร็จ' },
  { key: 'done', label: 'เสร็จแล้ว' },
  { key: 'overdue', label: 'เลยกำหนด' },
]

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'due', label: 'ใกล้กำหนดก่อน' },
  { key: 'priority', label: 'สำคัญก่อน' },
  { key: 'newest', label: 'เพิ่มล่าสุด' },
]

function matches(done: boolean, t: Todo, f: FilterKey): boolean {
  if (f === 'active') return !done
  if (f === 'done') return done
  if (f === 'overdue') return isOverdue(t.due_date, done, today.value)
  return true
}

export type GroupKey =
  | 'overdue'
  | 'today'
  | 'week'
  | 'later'
  | 'none'
  | 'high'
  | 'normal'
  | 'low'
  | 'addedToday'
  | 'addedYesterday'
  | 'addedEarlier'
  | 'done'
export interface ListGroup {
  key: GroupKey
  label: string
  items: Todo[]
  /** Tasks that really belong here (a ticked card may still be settling in its old group). */
  count: number
}

/*
 * Every sort has headings, so the page keeps one shape and always says how it is ordered
 * (QA round 4, P13). "7 วันข้างหน้า" and "หลังจากนั้น" read as a run of time and are not
 * mistaken for the single day "อีก 7 วัน" of the date picker (P6, P9).
 */
export const GROUP_LABEL: Record<GroupKey, string> = {
  overdue: 'เลยกำหนด',
  today: 'วันนี้',
  week: '7 วันข้างหน้า',
  later: 'หลังจากนั้น',
  none: 'ไม่มีกำหนดส่ง',
  high: PRIORITY_LABEL.high,
  normal: PRIORITY_LABEL.normal,
  low: PRIORITY_LABEL.low,
  addedToday: 'สร้างวันนี้',
  addedYesterday: 'สร้างเมื่อวาน',
  addedEarlier: 'สร้างก่อนหน้านั้น',
  done: 'เสร็จแล้ว',
}

const FAR = '9999-12-31'
const byDue = (a: Todo, b: Todo) => {
  const x = a.due_date ?? FAR
  const y = b.due_date ?? FAR
  return x < y ? -1 : x > y ? 1 : 0
}
/** Rows that are still being created count as the newest. */
const createdKey = (t: Todo) => (t.id < 0 ? '~' : t.created_at)
const byNewest = (a: Todo, b: Todo) => {
  const x = createdKey(a)
  const y = createdKey(b)
  return x < y ? 1 : x > y ? -1 : Math.abs(b.id) - Math.abs(a.id)
}
/** Most recently completed first; done tasks without a time (older data) after those (P16). */
const byCompleted = (a: Todo, b: Todo) => {
  const x = a.completed_at ?? ''
  const y = b.completed_at ?? ''
  return x < y ? 1 : x > y ? -1 : b.id - a.id
}

/** The open group a task belongs to in the given sort. */
function openGroup(t: Todo, s: SortKey, d: string): GroupKey {
  if (s === 'priority') return t.priority
  if (s === 'newest') {
    const added = t.id < 0 ? d : toISO(new Date(t.created_at))
    return added >= d ? 'addedToday' : added === addDays(d, -1) ? 'addedYesterday' : 'addedEarlier'
  }
  if (!t.due_date) return 'none'
  if (t.due_date < d) return 'overdue'
  if (t.due_date === d) return 'today'
  return t.due_date <= addDays(d, 7) ? 'week' : 'later'
}

const ORDER: Record<SortKey, GroupKey[]> = {
  due: ['overdue', 'today', 'week', 'later', 'none', 'done'],
  priority: ['high', 'normal', 'low', 'done'],
  newest: ['addedToday', 'addedYesterday', 'addedEarlier', 'done'],
}

/** Where a search word was found in the note, when the title does not have it (U14). */
export interface NoteHit {
  before: string
  match: string
  after: string
}

export function useListUi() {
  const { todos, effDone } = useTodos()

  const counts = computed(() => {
    const out: Record<FilterKey, number> = { all: 0, active: 0, done: 0, overdue: 0 }
    for (const t of todos.value) {
      for (const f of FILTERS) if (matches(t.is_completed, t, f.key)) out[f.key]++
    }
    return out
  })

  const visible = computed(() => {
    const q = query.value.trim().toLowerCase()
    return todos.value.filter(
      (t) =>
        matches(effDone(t), t, filter.value) &&
        (!q || t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)),
    )
  })

  /**
   * The visible tasks cut into labelled groups in the order of the chosen sort. Done tasks are
   * always the last group, the most recently completed first. A card being ticked keeps its old
   * group for a moment (settling) and then moves.
   */
  const groups = computed<ListGroup[]>(() => {
    const s = sort.value
    const d = today.value
    const buckets = new Map<GroupKey, Todo[]>()
    for (const t of visible.value) {
      const key = effDone(t) ? 'done' : openGroup(t, s, d)
      const list = buckets.get(key)
      if (list) list.push(t)
      else buckets.set(key, [t])
    }
    const out: ListGroup[] = []
    for (const key of ORDER[s]) {
      const items = buckets.get(key)
      if (!items) continue
      if (key === 'done') items.sort(byCompleted)
      else if (s === 'due') items.sort((a, b) => byDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id - b.id)
      else if (s === 'priority') items.sort((a, b) => byDue(a, b) || a.id - b.id)
      else items.sort(byNewest)
      const count = items.filter((t) => t.is_completed === (key === 'done')).length
      out.push({ key, label: GROUP_LABEL[key], items, count })
    }
    return out
  })

  /** The group label a task shows under now (filter all, current sort). */
  function groupLabelOf(t: Todo): string {
    return GROUP_LABEL[t.is_completed ? 'done' : openGroup(t, sort.value, today.value)]
  }

  /**
   * Toast text after a tick on the list: where the card went, in the words on screen
   * (QA round 4, owner decision 4).
   */
  function tickMessage(t: Todo, done: boolean): string {
    const name = `“${t.title}”`
    if (done) {
      if (filter.value === 'all') return `เสร็จแล้ว ${name} ย้ายไปกลุ่ม เสร็จแล้ว`
      return `เสร็จแล้ว ${name} ดูได้ที่ตัวกรอง เสร็จแล้ว`
    }
    if (filter.value === 'done') return `ยังไม่เสร็จ ${name} ดูได้ที่ตัวกรอง ยังไม่เสร็จ`
    return `ยังไม่เสร็จ ${name} ย้ายกลับไปไว้ในกลุ่ม ${groupLabelOf(t)}`
  }

  function noteHit(t: Todo): NoteHit | null {
    const q = query.value.trim().toLowerCase()
    if (!q || t.title.toLowerCase().includes(q) || !t.notes) return null
    const i = t.notes.toLowerCase().indexOf(q)
    if (i < 0) return null
    const text = t.notes.replace(/\s+/g, ' ')
    const j = t.notes.slice(0, i).replace(/\s+/g, ' ').length
    const from = Math.max(0, j - 16)
    const to = Math.min(text.length, j + q.length + 24)
    return {
      before: (from > 0 ? '…' : '') + text.slice(from, j),
      match: text.slice(j, j + q.length),
      after: text.slice(j + q.length, to) + (to < text.length ? '…' : ''),
    }
  }

  const emptyText = computed(() => {
    const q = query.value.trim()
    if (q) return `ไม่พบงานที่ตรงกับ “${q}”`
    if (filter.value === 'active') return 'ไม่มีงานค้าง เคลียร์หมดแล้ว'
    if (filter.value === 'done') return 'ยังไม่มีงานที่เสร็จ'
    if (filter.value === 'overdue') return 'ไม่มีงานเลยกำหนด เยี่ยมมาก'
    return 'ไม่มีงานที่ตรงกับตัวกรองนี้'
  })

  function toggleSearch() {
    searchOpen.value = !searchOpen.value
    query.value = ''
  }

  /** The yellow sticker on the list: back to the default view, so today's group can be shown. */
  function showAllByDue() {
    filter.value = 'all'
    sort.value = 'due'
    query.value = ''
  }

  return {
    filter,
    query,
    sort,
    searchOpen,
    counts,
    visible,
    groups,
    emptyText,
    toggleSearch,
    tickMessage,
    noteHit,
    showAllByDue,
  }
}
