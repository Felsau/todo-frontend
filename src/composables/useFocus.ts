import { onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export function focusables(root: HTMLElement | null | undefined): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex !== -1 && el.getClientRects().length > 0,
  )
}

/** Keeps Tab and Shift+Tab inside the container (use on keydown). */
export function trapTab(e: KeyboardEvent, root: HTMLElement | null | undefined) {
  if (e.key !== 'Tab' || !root) return
  const items = focusables(root)
  if (items.length === 0) {
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault()
    first.focus()
  }
}

let locks = 0
function setLock(on: boolean) {
  locks = Math.max(0, locks + (on ? 1 : -1))
  document.body.style.overflow = locks > 0 ? 'hidden' : ''
}

/** Stops the page behind a dialog or sheet from scrolling while `active` is true. */
export function useScrollLock(active: Ref<boolean>) {
  let on = false
  watch(
    active,
    (v) => {
      if (v !== on) {
        on = v
        setLock(v)
      }
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    if (on) setLock(false)
    on = false
  })
}
