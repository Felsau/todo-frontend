import { computed, reactive, ref } from 'vue'
import { ApiError, todosApi } from '../api/todos'
import type { Priority, Todo, TodoPatch } from '../types'
import { isOverdue, today } from '../utils/date'

/*
 * Shared todo store (module singleton, so the list, the calendar and the
 * detail dialog all see the same state).
 *
 * Every action calls the API immediately (requirement 7). The UI updates
 * first (optimistic), rolls back on failure and shows a red toast.
 */

export type LoadStatus = 'loading' | 'ready' | 'error'
export type ToastKind = 'undo' | 'saved' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  actionLabel?: string
  onAction?: () => void
}

const TOAST_MS: Record<ToastKind, number> = { undo: 5000, saved: 2500, error: 6000 }
const SETTLE_MS = 800
const BUSY_MS = 300
const WAKE_AFTER_MS = 3000
/** While the host wakes it may refuse or answer 502 to 504; keep retrying this long. */
const WAKE_GIVE_UP_MS = 120_000
const WAKE_RETRY_MS = 3000

const todos = ref<Todo[]>([])
const status = ref<LoadStatus>('loading')
/**
 * Seconds the first load has been waiting, once it passes WAKE_AFTER_MS (else 0).
 * The API runs on a free host that sleeps when idle and takes about a minute to wake,
 * so a long first load gets its own "waking the server" message instead of a bare skeleton.
 */
const waitedSec = ref(0)
const toast = ref<Toast | null>(null)

/** id -> the "done" value to show while a ticked card settles in place. */
const settling = reactive<Record<number, boolean>>({})
/** ids whose request has taken longer than 300 ms (spinner in the toggle). */
const busy = reactive<Record<number, boolean>>({})
/** ids whose actions are disabled (rows that are still being created). */
const locked = reactive<Record<number, boolean>>({})

let toastSeq = 0
let tempSeq = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined
const settleTimers = new Map<number, ReturnType<typeof setTimeout>>()
const chains = new Map<number, Promise<unknown>>()

/* ---------- toasts: one slot, newest replaces the old one ---------- */

function showToast(kind: ToastKind, message: string, extra: Pick<Toast, 'actionLabel' | 'onAction'> = {}) {
  clearTimeout(toastTimer)
  const id = ++toastSeq
  toast.value = { id, kind, message, ...extra }
  toastTimer = setTimeout(() => {
    if (toast.value?.id === id) toast.value = null
  }, TOAST_MS[kind])
}

function dismissToast() {
  clearTimeout(toastTimer)
  toast.value = null
}

const MSG = {
  toggle: 'บันทึกไม่สำเร็จ เราย้อนกลับให้แล้ว ลองอีกครั้งนะ',
  add: 'เพิ่มงานไม่สำเร็จ ลองอีกครั้งนะ',
  remove: 'ลบไม่สำเร็จ เรากู้งานกลับมาให้แล้ว ลองอีกครั้งนะ',
  undo: 'กู้งานกลับมาไม่สำเร็จ ลองอีกครั้งนะ',
  clear: 'ล้างรายการไม่สำเร็จ เรากู้งานกลับมาให้แล้ว ลองอีกครั้งนะ',
  gone: 'งานนี้ถูกลบไปแล้ว',
}

/* ---------- helpers ---------- */

function find(id: number): Todo | undefined {
  return todos.value.find((t) => t.id === id)
}

function indexOf(id: number): number {
  return todos.value.findIndex((t) => t.id === id)
}

/** Requests for one todo run one after another so rapid clicks cannot reorder. */
function serial<T>(id: number, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(id) ?? Promise.resolve()
  const next = prev.catch(() => undefined).then(fn)
  chains.set(id, next)
  next
    .finally(() => {
      if (chains.get(id) === next) chains.delete(id)
    })
    .catch(() => undefined)
  return next
}

/** Marks the todo busy only when its request takes longer than 300 ms. */
function withBusy<T>(id: number, p: Promise<T>): Promise<T> {
  const timer = setTimeout(() => {
    busy[id] = true
  }, BUSY_MS)
  return p.finally(() => {
    clearTimeout(timer)
    delete busy[id]
  })
}

/* Settle: a ticked card keeps its place (also in the current filter tab) for 800 ms. */
function startSettle(id: number, prevDone: boolean) {
  if (!(id in settling)) settling[id] = prevDone
  clearTimeout(settleTimers.get(id))
  settleTimers.set(
    id,
    setTimeout(() => {
      delete settling[id]
      settleTimers.delete(id)
    }, SETTLE_MS),
  )
}

/** The "done" value to use for ordering and filtering (honours settling). */
function effDone(t: Todo): boolean {
  return id_in(settling, t.id) ? settling[t.id] : t.is_completed
}

function id_in(obj: Record<number, boolean>, id: number): boolean {
  return Object.prototype.hasOwnProperty.call(obj, id)
}

function swapRow(tempId: number, row: Todo) {
  const i = indexOf(tempId)
  if (i >= 0) todos.value.splice(i, 1, row)
  else todos.value.push(row)
}

/* ---------- actions ---------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isWaking = (e: unknown) => e instanceof ApiError && (e.status === 0 || (e.status >= 502 && e.status <= 504))

async function load() {
  status.value = 'loading'
  waitedSec.value = 0
  const started = Date.now()
  const tick = setInterval(() => {
    const ms = Date.now() - started
    waitedSec.value = ms >= WAKE_AFTER_MS ? Math.floor(ms / 1000) : 0
  }, 250)
  try {
    for (;;) {
      try {
        todos.value = await todosApi.list()
        status.value = 'ready'
        return
      } catch (e) {
        if (!isWaking(e) || Date.now() - started > WAKE_GIVE_UP_MS) throw e
        await sleep(WAKE_RETRY_MS)
      }
    }
  } catch {
    status.value = 'error'
  } finally {
    clearInterval(tick)
    waitedSec.value = 0
  }
}

function add(input: { title: string; priority: Priority; due_date: string | null }) {
  const title = input.title.trim()
  if (!title) return
  const tempId = --tempSeq
  const stamp = new Date().toISOString()
  todos.value.push({
    id: tempId,
    title,
    is_completed: false,
    priority: input.priority,
    due_date: input.due_date,
    notes: null,
    created_at: stamp,
    updated_at: stamp,
  })
  locked[tempId] = true
  todosApi
    .create({ title, priority: input.priority, due_date: input.due_date })
    .then((row) => swapRow(tempId, row))
    .catch(() => {
      const i = indexOf(tempId)
      if (i >= 0) todos.value.splice(i, 1)
      showToast('error', MSG.add)
    })
    .finally(() => {
      delete locked[tempId]
    })
}

function toggle(id: number) {
  const t = find(id)
  if (!t || locked[id]) return
  const next = !t.is_completed
  startSettle(id, t.is_completed)
  t.is_completed = next
  withBusy(
    id,
    serial(id, () => todosApi.update(id, { is_completed: next })),
  )
    .then((row) => {
      const cur = find(id)
      if (cur) cur.updated_at = row.updated_at
    })
    .catch((err: unknown) => {
      const cur = find(id)
      if (err instanceof ApiError && err.isNotFound) {
        const i = indexOf(id)
        if (i >= 0) todos.value.splice(i, 1)
        showToast('error', MSG.gone)
        return
      }
      if (cur && cur.is_completed === next) cur.is_completed = !next
      showToast('error', MSG.toggle)
    })
}

interface Removal {
  todo: Todo
  index: number
  request: Promise<void>
}

function remove(id: number) {
  const index = indexOf(id)
  if (index < 0 || locked[id]) return
  const todo = { ...todos.value[index] }
  todos.value.splice(index, 1)
  delete settling[id]

  const request = serial(id, () => todosApi.remove(id)).catch((err: unknown) => {
    if (err instanceof ApiError && err.isNotFound) return // already gone, that is fine
    throw err
  })
  const removal: Removal = { todo, index, request }

  showToast('undo', `ลบ “${todo.title}” แล้ว`, {
    actionLabel: 'เลิกทำ',
    onAction: () => undoRemove(removal),
  })

  request.catch(() => {
    // The DELETE failed: bring the card back and tell the user.
    todos.value.splice(Math.min(index, todos.value.length), 0, todo)
    showToast('error', MSG.remove)
  })
}

async function undoRemove({ todo, index, request }: Removal) {
  dismissToast()
  const tempId = --tempSeq
  todos.value.splice(Math.min(index, todos.value.length), 0, { ...todo, id: tempId })
  locked[tempId] = true // the card's actions stay off until the POST returns
  try {
    const deleted = await request.then(
      () => true,
      () => false,
    )
    if (!deleted) {
      // The delete itself failed and already restored the original card.
      const i = indexOf(tempId)
      if (i >= 0) todos.value.splice(i, 1)
      return
    }
    const row = await todosApi.create({
      title: todo.title,
      is_completed: todo.is_completed,
      priority: todo.priority,
      due_date: todo.due_date,
      notes: todo.notes,
    })
    swapRow(tempId, row)
  } catch {
    const i = indexOf(tempId)
    if (i >= 0) todos.value.splice(i, 1)
    showToast('error', MSG.undo)
  } finally {
    delete locked[tempId]
  }
}

async function clearCompleted() {
  const removed = todos.value.filter((t) => t.is_completed && t.id > 0)
  if (removed.length === 0) return
  const ids = new Set(removed.map((t) => t.id))
  todos.value = todos.value.filter((t) => !ids.has(t.id))
  try {
    await Promise.allSettled([...chains.values()]) // let pending ticks reach the API first
    await todosApi.removeCompleted()
  } catch {
    todos.value = [...todos.value, ...removed].sort((a, b) => a.id - b.id)
    showToast('error', MSG.clear)
  }
}

/** Save from the detail dialog: not optimistic, errors go back to the dialog. */
async function saveDetail(id: number, patch: TodoPatch): Promise<Todo> {
  const row = await serial(id, () => todosApi.update(id, patch))
  const cur = find(id)
  if (cur) Object.assign(cur, row)
  return row
}

/* ---------- derived ---------- */

const total = computed(() => todos.value.length)
const doneCount = computed(() => todos.value.filter((t) => t.is_completed).length)
const overdueCount = computed(
  () => todos.value.filter((t) => isOverdue(t.due_date, t.is_completed, today.value)).length,
)

export function useTodos() {
  return {
    todos,
    status,
    waitedSec,
    toast,
    settling,
    busy,
    locked,
    total,
    doneCount,
    overdueCount,
    effDone,
    load,
    add,
    toggle,
    remove,
    clearCompleted,
    saveDetail,
    showToast,
    dismissToast,
  }
}
