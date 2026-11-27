import { computed } from 'vue'
import { PRIORITY_BG, PRIORITY_RANK, type Todo } from '../types'
import { isOverdue, today } from '../utils/date'
import { useTodos } from './useTodos'

/* Todos grouped by due date for the calendar, ordered like the day list in the prototypes. */
export function useCalendarTodos() {
  const { todos, effDone } = useTodos()

  /** Done last (using the settled value), then by priority. */
  const order = (a: Todo, b: Todo) => {
    const da = effDone(a)
    const db = effDone(b)
    if (da !== db) return da ? 1 : -1
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id - b.id
  }

  const byDate = computed(() => {
    const map = new Map<string, Todo[]>()
    for (const t of todos.value) {
      if (!t.due_date) continue
      const list = map.get(t.due_date)
      if (list) list.push(t)
      else map.set(t.due_date, [t])
    }
    for (const list of map.values()) list.sort(order)
    return map
  })

  const on = (iso: string): Todo[] => byDate.value.get(iso) ?? []
  const undated = computed(() => todos.value.filter((t) => !t.due_date && !t.is_completed))

  /** Chip colours: overdue is red with white text, done is white, otherwise the priority colour. */
  function chipClass(t: Todo): string {
    if (t.is_completed) return 'bg-white text-ink line-through'
    if (isOverdue(t.due_date, false, today.value)) return 'bg-danger text-white'
    return `${PRIORITY_BG[t.priority]} text-ink`
  }

  /** Dot colour for the mobile week strip. */
  function dotClass(t: Todo): string {
    if (t.is_completed) return 'bg-white'
    if (isOverdue(t.due_date, false, today.value)) return 'bg-danger'
    return PRIORITY_BG[t.priority]
  }

  return { on, undated, chipClass, dotClass }
}
