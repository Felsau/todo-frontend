import { computed, ref } from 'vue'
import { PRIORITY_RANK, type FilterKey, type SortKey, type Todo } from '../types'
import { addDays, isOverdue, today } from '../utils/date'
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

export type GroupKey = 'all' | 'overdue' | 'today' | 'week' | 'later' | 'none' | 'done'
export interface ListGroup {
  key: GroupKey
  /** Empty for the single group of the other sorts. */
  label: string
  items: Todo[]
}
const GROUP_LABEL: Record<GroupKey, string> = {
  all: '',
  overdue: 'เลยกำหนด',
  today: 'วันนี้',
  week: 'ภายใน 7 วัน',
  later: 'ภายหลัง',
  none: 'ไม่มีกำหนดส่ง',
  done: 'เสร็จแล้ว',
}

const FAR = '9999-12-31'
const byDue = (a: Todo, b: Todo) => {
  const x = a.due_date ?? FAR
  const y = b.due_date ?? FAR
  return x < y ? -1 : x > y ? 1 : 0
}
/** Rows that are still being created count as the newest. */
const newestKey = (t: Todo) => (t.id < 0 ? Number.MAX_SAFE_INTEGER + Math.abs(t.id) : t.id)

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
    return todos.value
      .filter((t) => matches(effDone(t), t, filter.value) && (!q || t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const da = effDone(a)
        const db = effDone(b)
        if (da !== db) return da ? 1 : -1 // done items always go last
        if (sort.value === 'priority') {
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b)
        }
        if (sort.value === 'newest') return newestKey(b) - newestKey(a)
        return byDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      })
  })

  /**
   * Sorted by due date, the list is cut into labelled groups (เลยกำหนด, วันนี้, ภายใน 7 วัน,
   * ภายหลัง, ไม่มีกำหนดส่ง, เสร็จแล้ว), each its own grid, so the order in time reads at a glance
   * instead of zigzagging across three coloured columns (QA round 3, UI 2).
   * Other sorts give one group without a heading.
   */
  const groups = computed<ListGroup[]>(() => {
    if (sort.value !== 'due') return visible.value.length ? [{ key: 'all', label: '', items: visible.value }] : []
    const t = today.value
    const week = addDays(t, 7)
    const out: ListGroup[] = []
    for (const todo of visible.value) {
      const key: GroupKey = effDone(todo)
        ? 'done'
        : !todo.due_date
          ? 'none'
          : todo.due_date < t
            ? 'overdue'
            : todo.due_date === t
              ? 'today'
              : todo.due_date <= week
                ? 'week'
                : 'later'
      const last = out[out.length - 1]
      if (last?.key === key) last.items.push(todo)
      else out.push({ key, label: GROUP_LABEL[key], items: [todo] })
    }
    return out
  })

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

  return { filter, query, sort, searchOpen, counts, visible, groups, emptyText, toggleSearch }
}
