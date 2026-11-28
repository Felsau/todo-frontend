<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, useId, watch } from 'vue'
import { SORTS } from '../composables/useListUi'
import { useScrollLock } from '../composables/useFocus'
import { useHistoryModal } from '../composables/useHistoryModal'
import { useIsSm } from '../composables/useMedia'
import type { SortKey } from '../types'
import Icon from './Icon.vue'

/*
 * The app's own sort menu, in place of the browser's <select>, whose popup list is drawn by the
 * browser. A menu button that opens a WAI-ARIA listbox: arrows move, Home and End jump, Enter or
 * Space picks, Esc closes and focus goes back to the button; typing the first letter is not needed
 * (three options). 640px and up: a popover under the button, kept on screen. Below 640px: a bottom
 * sheet with 44px rows that the phone's Back button closes.
 */
const model = defineModel<SortKey>({ required: true })
defineProps<{ fieldClass: string }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const isSm = useIsSm()
const uid = useId()
const labelId = `${uid}-label`
const listId = `${uid}-list`
const current = computed(() => SORTS.find((s) => s.key === model.value) ?? SORTS[0]!)
const active = ref(0)

useScrollLock(toRef(() => open.value && !isSm.value))
useHistoryModal({ key: 'sort', open: toRef(() => open.value && !isSm.value), onBack: () => close(false) })

function trigger(): HTMLElement | null {
  return root.value?.querySelector<HTMLElement>('[data-sort-trigger]') ?? null
}
function optionEls(): HTMLElement[] {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('[role=option]') ?? [])
}
function focusActive() {
  optionEls()[active.value]?.focus()
}

async function show() {
  active.value = Math.max(0, SORTS.findIndex((s) => s.key === model.value))
  open.value = true
  await nextTick()
  place()
  focusActive()
}
function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) void nextTick(() => trigger()?.focus())
}
function toggle() {
  if (open.value) close()
  else void show()
}
function pick(i: number) {
  model.value = SORTS[i]!.key
  close()
}
function move(i: number) {
  active.value = (i + SORTS.length) % SORTS.length
  void nextTick(focusActive)
}

function onTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!open.value) void show()
  }
}
function onPanelKey(e: KeyboardEvent) {
  const i = active.value
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      move(Math.min(i + 1, SORTS.length - 1))
      break
    case 'ArrowUp':
      e.preventDefault()
      move(Math.max(i - 1, 0))
      break
    case 'Home':
      e.preventDefault()
      move(0)
      break
    case 'End':
      e.preventDefault()
      move(SORTS.length - 1)
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      pick(i)
      break
    case 'Escape':
      e.preventDefault()
      e.stopPropagation()
      close()
      break
    case 'Tab':
      e.stopPropagation()
      e.preventDefault()
      close()
      break
  }
}

const EDGE = 8
const GAP = 6
/** Popover placement: under the button, above it when there is no room, never off the screen. */
function place() {
  const p = panel.value
  const t = trigger()
  if (!open.value || !isSm.value || !p || !t) return
  const r = t.getBoundingClientRect()
  p.style.minWidth = `${r.width}px`
  const w = p.offsetWidth
  const h = p.offsetHeight
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  let top = r.bottom + GAP
  if (top + h > vh - EDGE) {
    const above = r.top - GAP - h
    top = above >= EDGE ? above : Math.max(EDGE, vh - EDGE - h)
  }
  const left = Math.max(EDGE, Math.min(r.left, vw - EDGE - w))
  p.style.top = `${top}px`
  p.style.left = `${left}px`
  const a = p.getBoundingClientRect()
  p.style.top = `${2 * top - a.top}px`
  p.style.left = `${2 * left - a.left}px`
}
function onDocPointerDown(e: PointerEvent) {
  if (!open.value || !isSm.value) return
  const t = e.target as Node
  if (root.value?.contains(t) || panel.value?.contains(t)) return
  close(false)
}
const onReflow = () => place()
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  window.addEventListener('resize', onReflow)
  window.addEventListener('scroll', onReflow, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('resize', onReflow)
  window.removeEventListener('scroll', onReflow, true)
})
watch(isSm, () => close(false))

const rowClass =
  'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] border-2 border-transparent px-3 text-[1rem] font-semibold text-ink hover:bg-sel sm:text-[0.875rem]'
</script>

<template>
  <div ref="root" class="relative min-w-0 flex-1 sm:min-w-37.5 sm:flex-none">
    <span :id="labelId" class="sr-only">เรียง</span>
    <button
      type="button"
      data-sort-trigger
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? listId : undefined"
      :aria-labelledby="`${labelId} ${uid}-value`"
      :class="[fieldClass, 'flex items-center pr-9 pl-3.5 text-left']"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span :id="`${uid}-value`" class="truncate">{{ current.label }}</span>
    </button>
    <Icon name="chevronDown" :size="14" :stroke="3" class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 transition-transform" :class="open && 'rotate-180'" />

    <template v-if="open">
      <Teleport to="body" :disabled="isSm">
        <button
          v-if="!isSm"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          class="fixed inset-0 z-50 size-full cursor-default border-0 bg-ink/45 p-0"
          @click="close()"
        />
        <div
          ref="panel"
          class="z-[51] box-border bg-white"
          :class="
            isSm
              ? 'fixed top-0 left-0 w-max max-w-[calc(100vw-1rem)] rounded-[14px] border-2 p-1.5 shadow-brutal'
              : 'fixed inset-x-0 bottom-0 max-h-full overflow-y-auto rounded-t-[20px] border-2 border-b-0 px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] motion-safe:animate-sheet-up'
          "
          @keydown="onPanelKey"
        >
          <h2 v-if="!isSm" :id="`${uid}-title`" class="m-0 mb-2 px-1 text-[1.25rem] leading-normal font-bold">เรียงลำดับ</h2>
          <div
            :id="listId"
            role="listbox"
            :aria-labelledby="isSm ? labelId : `${uid}-title`"
            class="flex flex-col gap-1"
          >
            <div
              v-for="(s, i) in SORTS"
              :key="s.key"
              role="option"
              :aria-selected="s.key === model"
              :data-sort-option="s.key"
              :tabindex="i === active ? 0 : -1"
              :class="[rowClass, s.key === model && 'border-ink bg-accent']"
              @click="pick(i)"
              @pointermove="active = i"
            >
              <span class="min-w-0 flex-1">{{ s.label }}</span>
              <Icon v-if="s.key === model" name="check" :size="18" />
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>
