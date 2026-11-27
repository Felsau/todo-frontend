export type Priority = 'low' | 'normal' | 'high'

export interface Todo {
  id: number
  title: string
  is_completed: boolean
  priority: Priority
  /** Plain YYYY-MM-DD string or null. Never parsed through UTC. */
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Fields the web app sends when creating a todo. */
export interface NewTodo {
  title: string
  is_completed?: boolean
  priority?: Priority
  due_date?: string | null
  notes?: string | null
}

export type TodoPatch = Partial<Pick<Todo, 'title' | 'is_completed' | 'priority' | 'due_date' | 'notes'>>

export type FilterKey = 'all' | 'active' | 'done' | 'overdue'
export type SortKey = 'due' | 'priority' | 'newest'

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'สำคัญมาก',
  normal: 'ปกติ',
  low: 'ไม่รีบ',
}

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 }

/** Tailwind background class per priority (card colour = priority). */
export const PRIORITY_BG: Record<Priority, string> = {
  high: 'bg-high',
  normal: 'bg-normal',
  low: 'bg-low',
}

export const PRIORITY_HEX: Record<Priority, string> = {
  high: '#FFC9D9',
  normal: '#FFE066',
  low: '#BDE0FE',
}

export const PRIORITIES: Priority[] = ['high', 'normal', 'low']
