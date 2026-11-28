<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useAddForm } from '../composables/useAddForm'
import { useDetail } from '../composables/useDetail'
import { useIsSm } from '../composables/useMedia'
import { useTodos, type Toast } from '../composables/useTodos'
import { focusHome } from '../utils/reveal'
import Icon from './Icon.vue'

/*
 * One toast slot. The newest toast replaces the old one.
 * While the task detail or the phone add sheet is open the toast sits at the top, so it never
 * covers their buttons (QA round 2, R2-07). At the bottom its height is published as --toast-lift,
 * so the + and back to top buttons move up above it. It stays while the pointer or keyboard focus is on it.
 * Screen readers hear every toast through two live regions that never leave the page.
 */
const { toast, liveMessage, alertMessage, dismissToast, holdToast } = useTodos()
const { detailId } = useDetail()
const { sheetOpen } = useAddForm()
const isSm = useIsSm()

const box = ref<HTMLElement | null>(null)
const actionBtn = ref<HTMLButtonElement | null>(null)
const atTop = computed(() => detailId.value !== null || (sheetOpen.value && !isSm.value) || (!!toast.value?.top && !isSm.value))

/* Room the floating buttons leave for the toast: its height plus a 12px gap, or nothing. */
let lastLift = 0
function setLift() {
  const h = box.value && !atTop.value ? box.value.offsetHeight + 12 : 0
  const root = document.documentElement
  const atEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 4
  root.style.setProperty('--toast-lift', `${h}px`)
  // Scrolled to the end: the page grows by the toast's height, so follow it and keep the last card clear (P14).
  if (h > lastLift && atEnd) requestAnimationFrame(() => window.scrollBy({ top: h - lastLift }))
  lastLift = h
}
const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(setLift)
watch(
  [box, atTop],
  ([el], [old]) => {
    if (old && old !== el) ro?.unobserve(old)
    if (el) ro?.observe(el)
    setLift()
  },
  { flush: 'post' },
)
onBeforeUnmount(() => ro?.disconnect())

/** The toast whose action was just used: its action decides where focus goes next. */
let actedId: number | null = null

function act() {
  const t = toast.value
  if (!t) return
  actedId = t.id
  dismissToast()
  t.onAction?.()
}

function closeX() {
  const t = toast.value
  actedId = t?.id ?? null
  dismissToast()
  letGo(t)
}

function letGo(t: Toast | null | undefined) {
  if (t?.returnFocus) t.returnFocus()
  else focusHome()
}

// Focus: into the action when asked, and back to the page when the toast goes away while holding it.
watch(
  toast,
  async (now, before) => {
    const hadFocus = !!box.value && box.value.contains(document.activeElement)
    await nextTick()
    if (now && now.id !== before?.id && now.autofocus) {
      actionBtn.value?.focus()
      return
    }
    if (hadFocus && before && before.id !== now?.id && before.id !== actedId) letGo(before)
  },
  { flush: 'pre' },
)

const hovered = ref(false)
const focused = ref(false)
watch([hovered, focused], ([h, f]) => holdToast(h || f))
watch(
  () => toast.value?.id,
  () => {
    hovered.value = false
    focused.value = false
  },
)

function onFocusOut(e: FocusEvent) {
  if (!box.value?.contains(e.relatedTarget as Node | null)) focused.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    const t = toast.value
    actedId = t?.id ?? null
    dismissToast()
    letGo(t)
  } else if (e.key === 'Tab') {
    // Leaving the toast goes back to where you were working, not out of the page.
    e.preventDefault()
    letGo(toast.value)
  }
}
</script>

<template>
  <div class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</div>
  <div class="sr-only" role="alert">{{ alertMessage }}</div>

  <div
    class="pointer-events-none fixed inset-x-5 z-60 flex justify-center sm:inset-x-6"
    :class="atTop ? 'top-5' : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-7'"
  >
    <div
      v-if="toast"
      ref="box"
      :key="toast.id"
      data-toast
      class="pointer-events-auto box-border flex max-w-full min-w-0 items-center gap-3 rounded-[14px] border-2 py-1.5 pr-1.5 pl-4 text-[0.875rem] leading-normal font-semibold text-white max-sm:w-full sm:gap-4 sm:pl-4.5"
      :class="toast.kind === 'error' ? 'bg-danger shadow-brutal-sm' : 'bg-ink shadow-brutal-accent'"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @focusin="focused = true"
      @focusout="onFocusOut"
      @keydown="onKeydown"
    >
      <Icon v-if="toast.kind === 'saved' || toast.kind === 'added' || toast.kind === 'change'" name="check" :size="16" :stroke="3" />
      <span class="min-w-0 flex-1 wrap-anywhere" :class="!toast.actionLabel && toast.kind !== 'error' && 'pr-1'">
        {{ toast.message }}
      </span>
      <button
        v-if="toast.actionLabel"
        ref="actionBtn"
        type="button"
        class="h-11 flex-none rounded-[10px] border-2 px-3.5 text-[0.875rem] font-semibold"
        :class="toast.kind === 'error' ? 'border-white bg-white text-danger' : 'border-white bg-accent text-ink'"
        @click="act"
      >
        {{ toast.actionLabel }}
      </button>
      <button
        v-else-if="toast.kind === 'error'"
        type="button"
        class="h-11 flex-none rounded-[10px] border-2 border-white bg-transparent px-3.5 text-[0.875rem] font-semibold text-white"
        aria-label="ปิดข้อความแจ้งเตือน"
        @click="dismissToast"
      >
        ปิด
      </button>
      <!-- A small X on every toast that has an action or stays a few seconds (recheck 2, M4). -->
      <button
        v-if="toast.actionLabel || toast.kind !== 'error'"
        type="button"
        data-toast-close
        class="flex size-11 flex-none items-center justify-center rounded-[10px] border-0 bg-transparent p-0 text-white"
        aria-label="ปิดข้อความ"
        @click="closeX"
      >
        <Icon name="close" :size="16" :stroke="3" />
      </button>
    </div>
  </div>
</template>
