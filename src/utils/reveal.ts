/*
 * Finding a task's card on screen: list cards and calendar rows carry data-todo-id.
 * Used to keep keyboard focus in a sensible place after deleting, and to show a new task.
 */

export function cardOf(id: number): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-todo-id="${id}"]`)
}

/** The card next to this one (or before it, for the last card), as a todo id. */
export function neighbourOf(id: number): number | null {
  const el = cardOf(id)
  const sib = (el?.nextElementSibling ?? null) as HTMLElement | null
  const prev = (el?.previousElementSibling ?? null) as HTMLElement | null
  const pick = sib?.dataset.todoId ? sib : prev?.dataset.todoId ? prev : null
  return pick ? Number(pick.dataset.todoId) : null
}

/**
 * Focuses the card's first control (its done toggle). With scroll=false the page never moves.
 * Returns false when the card is not on the page.
 */
export function focusCard(id: number, scroll = true): boolean {
  const btn = cardOf(id)?.querySelector<HTMLElement>('button:not(:disabled)')
  if (!btn) return false
  btn.focus({ preventScroll: !scroll || isOnScreen(btn) })
  return true
}

/** Somewhere calm for focus when its card is gone: the page title (no keyboard pops up on phones). */
export function focusHome() {
  document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
}

export function isOnScreen(el: Element): boolean {
  const r = el.getBoundingClientRect()
  return r.top >= 0 && r.bottom <= window.innerHeight
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Draws a short outline around a card so the eye finds it. */
export function flash(el: HTMLElement) {
  el.classList.remove('flash')
  void el.offsetWidth // restart the animation
  el.classList.add('flash')
  setTimeout(() => el.classList.remove('flash'), 1700)
}

/** Scrolls a card into the middle of the screen, focuses it and flashes it. */
export function revealCard(id: number) {
  const el = cardOf(id)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
  el.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  flash(el)
}
