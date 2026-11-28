import { computed, nextTick, reactive, ref } from 'vue'
import { ApiError, todosApi } from '../api/todos'
import type { Priority, Todo, TodoPatch } from '../types'
import { isOverdue, today } from '../utils/date'
import { cardOf, flash, focusCard, focusHome, isOnScreen, neighbourOf, revealCard } from '../utils/reveal'
import { isBlank } from '../utils/text'

/*
 * Shared todo store (module singleton, so the list, the calendar and the
 * detail dialog all see the same state).
 *
 * Every action calls the API immediately (requirement 7). The UI updates
 * first (optimistic), rolls back on failure and shows a red toast.
 */

export type LoadStatus = 'loading' | 'ready' | 'error'
/** Why the first load failed: this device has no internet, or the server did not answer. */
export type LoadError = 'offline' | 'failed'
/** undo: a delete can be undone. change: a tick or a date move can be undone. */
export type ToastKind = 'undo' | 'change' | 'added' | 'saved' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  actionLabel?: string
  onAction?: () => void
  /** Move keyboard focus to the action button when the toast appears. */
  autofocus?: boolean
  /** Where keyboard focus goes when the toast lets go of it (Tab, Esc, timeout). */
  returnFocus?: () => void
  /** Show at the top on phones, because the card that moved lands at the bottom (recheck 2, M4). */
  top?: boolean
}

/* A delete stays undoable for 8 s: 5 s was too short while scrolling (QA round 4, P15). */
const TOAST_MS: Record<ToastKind, number> = { undo: 8000, change: 6000, added: 4000, saved: 2500, error: 6000 }
const SETTLE_MS = 800
const BUSY_MS = 300
const WAKE_AFTER_MS = 3000
/** While the host wakes it may refuse or answer 502 to 504; keep retrying this long. */
const WAKE_GIVE_UP_MS = 120_000
const WAKE_RETRY_MS = 3000
/** A refresh when the tab comes back runs at most this often. */
const REFRESH_GAP_MS = 5000

const todos = ref<Todo[]>([])
const status = ref<LoadStatus>('loading')
const loadError = ref<LoadError>('failed')
/**
 * Seconds the first load has been waiting, once it passes WAKE_AFTER_MS (else 0).
 * The API runs on a free host that sleeps when idle and takes about a minute to wake,
 * so a long first load gets its own "waking the server" message instead of a bare skeleton.
 */
const waitedSec = ref(0)
const toast = ref<Toast | null>(null)
/** What screen readers hear: polite news and urgent errors (two live regions in ToastHost). */
const liveMessage = ref('')
const alertMessage = ref('')

/** id -> the "done" value to show while a ticked card settles in place. */
const settling = reactive<Record<number, boolean>>({})
/** ids whose request has taken longer than 300 ms (spinner in the toggle). */
const busy = reactive<Record<number, boolean>>({})
/** ids whose actions are disabled (rows that are still being created). */
const locked = reactive<Record<number, boolean>>({})

let toastSeq = 0
let tempSeq = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined
let toastHeld = false
const settleTimers = new Map<number, ReturnType<typeof setTimeout>>()
const chains = new Map<number, Promise<unknown>>()
/** The id the server gave a row that was created under a temporary id. */
const realIds = new Map<number, number>()
let bulkInFlight = false
let lastRefresh = 0

interface Removal {
  todo: Todo
  index: number
  request: Promise<void>
}
/** Deletions that one "เลิกทำ" brings back: quick deletes in a row share one toast (R2-06). */
let undoBatch: Removal[] = []

/* ---------- toasts: one slot, newest replaces the old one ---------- */

let flip = false
let sayTimer: ReturnType<typeof setTimeout> | undefined
/**
 * Puts text in a live region. A zero width space makes a repeated message count as new.
 * The text is cleared after a while, so nobody reading the page later meets a stale message.
 */
function say(text: string, urgent = false) {
  flip = !flip
  const value = flip ? text : `${text}\u200B`
  if (urgent) alertMessage.value = value
  else liveMessage.value = value
  clearTimeout(sayTimer)
  sayTimer = setTimeout(() => {
    liveMessage.value = ''
    alertMessage.value = ''
  }, 7000)
}

function armTimer() {
  clearTimeout(toastTimer)
  const t = toast.value
  if (!t || toastHeld) return
  toastTimer = setTimeout(() => {
    if (toast.value?.id === t.id) dismissToast()
  }, TOAST_MS[t.kind])
}

function showToast(
  kind: ToastKind,
  message: string,
  extra: Pick<Toast, 'actionLabel' | 'onAction' | 'autofocus' | 'returnFocus' | 'top'> = {},
) {
  if (kind !== 'undo') undoBatch = []
  toastHeld = false
  toast.value = { id: ++toastSeq, kind, message, ...extra }
  say(message, kind === 'error')
  armTimer()
}

function dismissToast() {
  clearTimeout(toastTimer)
  toastHeld = false
  toast.value = null
  undoBatch = []
}

/** While the pointer or keyboard focus is on the toast it stays put (WCAG 2.2.1). */
function holdToast(on: boolean) {
  toastHeld = on
  if (on) clearTimeout(toastTimer)
  else armTimer()
}

const MSG = {
  toggle: 'บันทึกไม่สำเร็จ เราย้อนกลับให้แล้ว ลองอีกครั้งนะ',
  addKept: 'เพิ่มงานไม่สำเร็จ ข้อความยังอยู่ในช่องพิมพ์ ลองกดเพิ่มอีกครั้งนะ',
  remove: 'ลบไม่สำเร็จ เรากู้งานกลับมาให้แล้ว ลองอีกครั้งนะ',
  undo: 'กู้งานกลับมาไม่สำเร็จ ลองอีกครั้งนะ',
  clear: 'ลบงานที่เสร็จแล้วไม่สำเร็จ เรากู้งานกลับมาให้แล้ว ลองอีกครั้งนะ',
  gone: 'งานนี้ถูกลบไปแล้ว',
  move: 'ย้ายวันไม่สำเร็จ เราย้อนกลับให้แล้ว ลองอีกครั้งนะ',
  offline: 'ยังไม่ได้ต่ออินเทอร์เน็ต ต่อแล้วลองใหม่อีกครั้งนะ',
  addOffline: 'ยังไม่ได้ต่ออินเทอร์เน็ต ข้อความยังอยู่ในช่องพิมพ์ ต่อแล้วกดเพิ่มอีกครั้งนะ',
}

/**
 * No internet on this device: say so once and change nothing, instead of flipping the card and
 * flipping it back a moment later (QA round 4, U13). The banner under the header says it too.
 */
function blockedOffline(message = MSG.offline): boolean {
  if (navigator.onLine) return false
  showToast('error', message)
  return true
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

/** True while something is on its way to the server, so a refresh must not overwrite it. */
function inFlight(): boolean {
  return bulkInFlight || chains.size > 0 || Object.keys(locked).length > 0 || Object.keys(settling).length > 0
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
      // No internet on this device: say so at once instead of waiting for the server (R2-21).
      if (!navigator.onLine) throw new ApiError(0, [], 'offline')
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
    loadError.value = navigator.onLine ? 'failed' : 'offline'
    status.value = 'error'
  } finally {
    clearInterval(tick)
    waitedSec.value = 0
  }
}

/** Picks up changes made in another tab or on another device (R2-08). Skips while anything is in flight. */
async function refresh(force = false) {
  if (status.value !== 'ready' || inFlight() || (!force && Date.now() - lastRefresh < REFRESH_GAP_MS)) return
  lastRefresh = Date.now()
  try {
    const rows = await todosApi.list()
    if (!inFlight()) todos.value = rows
  } catch {
    // Keep what is on screen; the next action reports any real problem.
  }
}

interface AddOptions {
  /** Put the typed values back into the form after a failure; false when the form is in use again. */
  restore?: () => boolean
  /** Shows the new card when the person asks to see it (default: scroll to it). */
  reveal?: (id: number) => void
  /** No toast: the phone add sheet shows its own confirmation and announces when it closes. */
  quiet?: boolean
}

/** Adds a task at once (optimistic) and returns its temporary id. */
function add(
  input: { title: string; priority: Priority; due_date: string | null },
  opts: AddOptions = {},
): number | undefined {
  const title = input.title.trim()
  if (isBlank(title)) return
  if (blockedOffline(MSG.addOffline)) return
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
    completed_at: null,
  })
  locked[tempId] = true
  if (!opts.quiet) void nextTick(() => announceAdded(tempId, title, opts.reveal))
  todosApi
    .create({ title, priority: input.priority, due_date: input.due_date })
    .then((row) => {
      realIds.set(tempId, row.id)
      swapRow(tempId, row)
    })
    .catch(() => {
      const i = indexOf(tempId)
      if (i >= 0) todos.value.splice(i, 1)
      // Keep what the person typed (R2-05): back into the form, or a retry button.
      if (opts.restore?.()) showToast('error', MSG.addKept)
      else
        showToast('error', `เพิ่ม “${title}” ไม่สำเร็จ`, {
          actionLabel: 'ลองใหม่',
          onAction: () => add(input, opts),
        })
    })
    .finally(() => {
      delete locked[tempId]
    })
  return tempId
}

/**
 * Tells the person the task was added, and where it went when it is off screen (R2-02).
 * Works with the temporary id also after the server has given the row its real id.
 */
function announceAdded(tempId: number, title: string, reveal?: (id: number) => void, message = `เพิ่ม “${title}” แล้ว`) {
  if (indexOf(tempId) < 0 && !realIds.has(tempId)) return // already failed and taken out
  const el = cardOf(realIds.get(tempId) ?? tempId)
  const visible = !!el && isOnScreen(el)
  if (el && visible) flash(el)
  if (toast.value?.kind === 'undo') {
    // Do not push away the chance to undo a delete; screen readers still hear it.
    say(message)
    return
  }
  if (visible) showToast('added', message)
  else
    showToast('added', message, {
      actionLabel: 'ดูงาน',
      onAction: () => (reveal ?? revealCard)(realIds.get(tempId) ?? tempId),
    })
}

/**
 * A tick or a date move can be undone from its toast. It never pushes away the chance to undo
 * a delete: then only screen readers hear it (QA round 4, owner decision 4).
 */
function offerChange(message: string, undo: () => void, top = false) {
  if (toast.value?.kind === 'undo') {
    say(message)
    return
  }
  showToast('change', message, { actionLabel: 'เลิกทำ', onAction: undo, top })
}

export interface ToggleOptions {
  /** Toast text for the change, written by the view that knows where the card goes. */
  describe?: (t: Todo, done: boolean) => string
  /** No toast (the undo itself, or the detail dialog that shows the change in place). */
  quiet?: boolean
}

/**
 * Ticks or unticks at once. The card keeps its place for a moment, then moves, and a toast says
 * where it went with "เลิกทำ" (QA round 4, P3). completed_at is set here too, so the done group
 * can be ordered by it before the server answers.
 */
function toggle(id: number, opts: ToggleOptions = {}) {
  const t = find(id)
  if (!t || locked[id]) return
  if (blockedOffline()) return
  const next = !t.is_completed
  const prevAt = t.completed_at
  startSettle(id, t.is_completed)
  t.is_completed = next
  t.completed_at = next ? new Date().toISOString() : null
  withBusy(
    id,
    serial(id, () => todosApi.update(id, { is_completed: next })),
  )
    .then((row) => {
      const cur = find(id)
      if (!cur) return
      cur.updated_at = row.updated_at
      // An API without completed_at keeps the time set above.
      if (row.completed_at !== undefined && cur.is_completed === next) cur.completed_at = row.completed_at
    })
    .catch((err: unknown) => {
      const cur = find(id)
      if (err instanceof ApiError && err.isNotFound) {
        const i = indexOf(id)
        if (i >= 0) todos.value.splice(i, 1)
        showToast('error', MSG.gone)
        return
      }
      if (cur && cur.is_completed === next) {
        cur.is_completed = !next
        cur.completed_at = prevAt
      }
      showToast('error', MSG.toggle)
    })
  if (opts.quiet) return
  const message = opts.describe?.(t, next) ?? (next ? `เสร็จแล้ว “${t.title}”` : `ยังไม่เสร็จ “${t.title}”`)
  offerChange(message, () => {
    const cur = find(id)
    if (cur && cur.is_completed === next) {
      toggle(id, { quiet: true })
      say('เลิกทำแล้ว')
    }
  }, next)
}

/** Changes only the due date, at once, and rolls back on failure. */
function setDue(id: number, due: string | null): boolean {
  const t = find(id)
  if (!t || locked[id] || t.due_date === due) return false
  if (blockedOffline()) return false
  const prev = t.due_date
  t.due_date = due
  withBusy(
    id,
    serial(id, () => todosApi.update(id, { due_date: due })),
  )
    .then((row) => {
      const cur = find(id)
      if (cur) cur.updated_at = row.updated_at
    })
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.isNotFound) {
        const i = indexOf(id)
        if (i >= 0) todos.value.splice(i, 1)
        showToast('error', MSG.gone)
        return
      }
      const cur = find(id)
      if (cur && cur.due_date === due) cur.due_date = prev
      showToast('error', MSG.move)
    })
  return true
}

/**
 * Moves an overdue task to today or tomorrow in one tap, with a toast and "เลิกทำ"
 * (QA round 4, owner decision 5).
 */
function reschedule(id: number, due: string, message: string): boolean {
  const prev = find(id)?.due_date ?? null
  if (!setDue(id, due)) return false
  offerChange(message, () => {
    if (find(id)?.due_date === due && setDue(id, prev)) say('เลิกทำแล้ว')
  })
  return true
}

/** One undo toast for this deletion, joined with any deletions whose toast is still showing. */
function offerUndo(removals: Removal[], keyboard: boolean, returnFocus: () => void) {
  const batch = toast.value?.kind === 'undo' ? [...undoBatch, ...removals] : [...removals]
  const message = batch.length === 1 ? `ลบ “${batch[0].todo.title}” แล้ว` : `ลบแล้ว ${batch.length} งาน`
  showToast('undo', message, {
    actionLabel: 'เลิกทำ',
    onAction: () => void undoAll(batch),
    autofocus: keyboard,
    returnFocus,
  })
  undoBatch = batch
}

/**
 * Deletes at once and offers undo. Keyboard focus moves to "เลิกทำ" when the delete came from
 * the keyboard, otherwise to the card that took its place, never to the page body (R2-04).
 */
function remove(id: number, opts: { keyboard?: boolean } = {}) {
  const index = indexOf(id)
  if (index < 0 || locked[id]) return
  if (blockedOffline()) return
  const next = neighbourOf(id)
  const todo = { ...todos.value[index] }
  todos.value.splice(index, 1)
  delete settling[id]

  const request = serial(id, () => todosApi.remove(id)).catch((err: unknown) => {
    if (err instanceof ApiError && err.isNotFound) return // already gone, that is fine
    throw err
  })
  const returnFocus = (scroll = true) => {
    if (next === null || !focusCard(next, scroll)) focusHome()
  }
  offerUndo([{ todo, index, request }], !!opts.keyboard, returnFocus)
  if (!opts.keyboard) void nextTick(() => returnFocus(false))

  request.catch(() => {
    // The DELETE failed: bring the card back and tell the user.
    todos.value.splice(Math.min(index, todos.value.length), 0, todo)
    showToast('error', MSG.remove)
  })
}

async function undoAll(batch: Removal[]) {
  undoBatch = []
  // Put cards back in the reverse order they were taken out, so every index is right.
  const ids = await Promise.all([...batch].reverse().map((r) => undoRemove(r)))
  const first = ids.reverse().find((x): x is number => x !== null)
  const lost = !document.activeElement || document.activeElement === document.body
  if (first !== undefined && lost) {
    await nextTick()
    focusCard(first)
  }
}

/** Brings one deleted todo back. Returns its new id, or null when it could not. */
async function undoRemove({ todo, index, request }: Removal): Promise<number | null> {
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
      return null
    }
    // The same created and completed times, so the task keeps its place in every order (U3).
    const plain = {
      title: todo.title,
      is_completed: todo.is_completed,
      priority: todo.priority,
      due_date: todo.due_date,
      notes: todo.notes,
    }
    const times = {
      created_at: todo.created_at,
      ...(todo.is_completed && todo.completed_at ? { completed_at: todo.completed_at } : {}),
    }
    // A server that refuses the times (for example a task made seconds ago) still gets the task back.
    const row = await todosApi.create({ ...plain, ...times }).catch((err: unknown) => {
      const timeField = (e: { field: string }) => e.field === 'created_at' || e.field === 'completed_at'
      if (err instanceof ApiError && err.isValidation && err.errors.some(timeField)) return todosApi.create(plain)
      throw err
    })
    // An API that ignores those fields still shows the old times until the next load.
    if (row.created_at !== todo.created_at) row.created_at = todo.created_at
    if (todo.is_completed && row.completed_at === null) row.completed_at = todo.completed_at
    swapRow(tempId, row)
    return row.id
  } catch {
    const i = indexOf(tempId)
    if (i >= 0) todos.value.splice(i, 1)
    showToast('error', MSG.undo)
    return null
  } finally {
    delete locked[tempId]
  }
}

/** Deletes every done todo, with the same undo as a single delete (R2-20). */
async function clearCompleted(opts: { keyboard?: boolean } = {}) {
  const removed = todos.value.filter((t) => t.is_completed && t.id > 0)
  if (removed.length === 0) return
  if (blockedOffline()) return
  const places = removed.map((t) => ({ todo: { ...t }, index: indexOf(t.id) }))
  const ids = new Set(removed.map((t) => t.id))
  todos.value = todos.value.filter((t) => !ids.has(t.id))
  bulkInFlight = true
  const request = (async () => {
    await Promise.allSettled([...chains.values()]) // let pending ticks reach the API first
    await todosApi.removeCompleted()
  })()
  request
    .finally(() => {
      bulkInFlight = false
    })
    .catch(() => undefined)
  offerUndo(
    places.map((p) => ({ ...p, request })),
    !!opts.keyboard,
    focusHome,
  )
  if (!opts.keyboard) void nextTick(focusHome)
  try {
    await request
  } catch {
    todos.value = [...todos.value, ...removed].sort((a, b) => a.id - b.id)
    showToast('error', MSG.clear)
  }
}

/** Save from the detail dialog: not optimistic, errors go back to the dialog. */
async function saveDetail(id: number, patch: TodoPatch): Promise<Todo> {
  const row = await serial(id, () => todosApi.update(id, patch))
  const cur = find(id)
  if (cur) {
    // An API without completed_at: keep the old value, or set it here when the status changed.
    const at =
      row.completed_at !== undefined
        ? row.completed_at
        : 'is_completed' in patch
          ? patch.is_completed
            ? new Date().toISOString()
            : null
          : cur.completed_at
    Object.assign(cur, row, { completed_at: at })
  }
  return row
}

/** Drops a card the server no longer has (deleted in another tab or on another device). */
function forget(id: number) {
  const i = indexOf(id)
  if (i >= 0) todos.value.splice(i, 1)
}

/* ---------- derived ---------- */

const total = computed(() => todos.value.length)
const doneCount = computed(() => todos.value.filter((t) => t.is_completed).length)
/**
 * The header sticker: tasks due today and how many of them are done. Nothing else is counted, so
 * it always equals the calendar's "เสร็จ x จาก y งาน" for today; overdue tasks have their own red
 * sticker (QA round 4, P1, P2, P23, U1, U2). `today` refreshes itself after midnight.
 */
const todayProgress = computed(() => {
  const d = today.value
  const scope = todos.value.filter((t) => t.due_date === d)
  return { total: scope.length, done: scope.filter((t) => t.is_completed).length }
})
const overdueCount = computed(
  () => todos.value.filter((t) => isOverdue(t.due_date, t.is_completed, today.value)).length,
)

export function useTodos() {
  return {
    todos,
    status,
    loadError,
    waitedSec,
    toast,
    liveMessage,
    alertMessage,
    settling,
    busy,
    locked,
    total,
    doneCount,
    overdueCount,
    todayProgress,
    effDone,
    load,
    refresh,
    add,
    announceAdded,
    toggle,
    reschedule,
    remove,
    clearCompleted,
    saveDetail,
    forget,
    showToast,
    dismissToast,
    holdToast,
    say,
  }
}
