<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, useId, watch } from 'vue'
import { trapTab } from '../composables/useFocus'
import { useHistoryModal } from '../composables/useHistoryModal'
import { useIsSm } from '../composables/useMedia'
import { WEEKDAY_SHORT, addDays, addMonths, eyebrowDate, monthEnd, monthLabel, startOfWeek, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * The app's own date picker, in Thai with the Buddhist year, in place of the browser's
 * <input type="date">, whose calendar follows the browser language (English, Christian year).
 * 640px and up: a popover under the trigger, flipped above or moved sideways to stay on screen.
 * Below 640px: a bottom sheet with 44px days that the phone's Back button closes.
 * Follows the WAI-ARIA date picker dialog pattern: arrows move a day or a week, Home and End go
 * to the start and end of the week, PageUp and PageDown change the month (with Shift, the year),
 * Enter or Space picks, Esc closes, and focus goes back to the trigger.
 */
const model = defineModel<string>({ required: true })
const props = withDefaults(defineProps<{ label?: string }>(), { label: 'ปฏิทินเลือกวันกำหนดส่ง' })

const WEEKDAY_LONG = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const grid = ref<HTMLElement | null>(null)
const isSm = useIsSm()
const headingId = `${useId()}-month`

/** The day that holds keyboard focus; the month shown is always its month. */
const focusIso = ref(today.value)
const view = computed(() => `${focusIso.value.slice(0, 7)}-01`)

/** Six rows of seven days, Sunday first like the app's calendar; days of other months are blank. */
const weeks = computed(() => {
  const start = startOfWeek(view.value)
  const month = view.value.slice(0, 7)
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const iso = addDays(start, w * 7 + d)
      return iso.slice(0, 7) === month ? iso : null
    }),
  )
})

// Phones: the sheet owns a history entry, so the Back button closes it (like the other sheets).
useHistoryModal({ key: 'date', open: toRef(() => open.value && !isSm.value), onBack: () => close() })

function trigger(): HTMLElement | null {
  return root.value?.querySelector<HTMLElement>('[data-date-trigger]') ?? null
}

function focusDay() {
  grid.value?.querySelector<HTMLElement>(`[data-pick-day="${focusIso.value}"]`)?.focus()
}

async function show() {
  focusIso.value = model.value || today.value
  open.value = true
  await nextTick()
  place()
  focusDay()
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

function pick(iso: string) {
  model.value = iso
  close()
}

async function moveTo(iso: string) {
  focusIso.value = iso
  await nextTick()
  focusDay()
}

/** The month buttons keep focus on themselves; the focused day moves with the month. */
function shiftMonth(n: number) {
  focusIso.value = addMonths(focusIso.value, n)
}

function onGridKey(e: KeyboardEvent) {
  const f = focusIso.value
  const first = view.value
  const last = monthEnd(f)
  let next: string | null = null
  switch (e.key) {
    case 'ArrowLeft':
      next = addDays(f, -1)
      break
    case 'ArrowRight':
      next = addDays(f, 1)
      break
    case 'ArrowUp':
      next = addDays(f, -7)
      break
    case 'ArrowDown':
      next = addDays(f, 7)
      break
    case 'Home': {
      const s = startOfWeek(f)
      next = s < first ? first : s
      break
    }
    case 'End': {
      const s = addDays(startOfWeek(f), 6)
      next = s > last ? last : s
      break
    }
    case 'PageUp':
      next = addMonths(f, e.shiftKey ? -12 : -1)
      break
    case 'PageDown':
      next = addMonths(f, e.shiftKey ? 12 : 1)
      break
  }
  if (next) {
    e.preventDefault()
    void moveTo(next)
  }
}

/** Esc and Tab stay inside the picker, so the dialog or sheet around it neither closes nor takes focus. */
function onPanelKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
  } else if (e.key === 'Tab') {
    e.stopPropagation()
    trapTab(e, panel.value)
  }
}

/*
 * Popover placement: under the trigger, or above it when there is no room below; moved left
 * when it would run off the right edge. Fixed positioning escapes the scrolling dialog around it;
 * the second pass corrects for any ancestor that makes itself the containing block.
 */
const EDGE = 8
const GAP = 6
function place() {
  const p = panel.value
  const t = trigger()
  if (!open.value || !isSm.value || !p || !t) return
  const r = t.getBoundingClientRect()
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
  if (root.value && !root.value.contains(e.target as Node)) close(false)
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
// Crossing 640px swaps popover and sheet; simply close.
watch(isSm, () => close(false))

const triggerProps = computed(() => ({
  'data-date-trigger': '',
  'aria-haspopup': 'dialog' as const,
  'aria-expanded': open.value,
  onClick: toggle,
}))

function dayClass(iso: string): string[] {
  const sel = iso === model.value
  const isToday = iso === today.value
  return [
    isToday ? 'rounded-full border-ink' : 'rounded-[10px] border-transparent',
    sel ? 'border-ink bg-accent shadow-brutal-sm' : 'hover:bg-sel',
    iso < today.value ? 'font-medium text-[#6b6862]' : 'font-bold text-ink',
  ]
}
</script>

<template>
  <div ref="root">
    <slot name="trigger" :open="open" :trigger-props="triggerProps" />

    <template v-if="open">
      <!-- phones: a backdrop under the sheet; tapping it closes the picker -->
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
        role="dialog"
        aria-modal="true"
        :aria-label="props.label"
        data-date-picker
        :data-month="view.slice(0, 7)"
        class="z-[51] box-border bg-white"
        :class="
          isSm
            ? 'fixed top-0 left-0 rounded-[14px] border-2 p-3 shadow-brutal'
            : 'fixed inset-x-0 bottom-0 max-h-full overflow-y-auto rounded-t-[20px] border-2 border-b-0 px-1 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] motion-safe:animate-sheet-up'
        "
        @keydown="onPanelKey"
      >
        <div class="mx-auto flex max-w-[26rem] flex-col gap-2 sm:max-w-none">
          <div class="flex items-center justify-between gap-2 px-2 sm:px-0">
            <button type="button" class="icon-btn" aria-label="เดือนก่อน" data-month-prev @click="shiftMonth(-1)">
              <Icon name="chevronLeft" :size="18" :stroke="3" />
            </button>
            <h2 :id="headingId" class="m-0 text-[1rem] leading-normal font-bold" aria-live="polite" data-month-label>
              {{ monthLabel(view) }}
            </h2>
            <button type="button" class="icon-btn" aria-label="เดือนถัดไป" data-month-next @click="shiftMonth(1)">
              <Icon name="chevronRight" :size="18" :stroke="3" />
            </button>
          </div>

          <table ref="grid" role="grid" :aria-labelledby="headingId" class="w-full table-fixed border-collapse sm:w-auto" @keydown="onGridKey">
            <thead>
              <tr role="row">
                <th
                  v-for="(w, i) in WEEKDAY_SHORT"
                  :key="w"
                  role="columnheader"
                  scope="col"
                  :abbr="WEEKDAY_LONG[i]"
                  class="h-7 p-0 text-center text-[0.8125rem] font-semibold"
                  data-weekday
                >
                  {{ w }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in weeks" :key="ri" role="row">
                <td
                  v-for="(iso, ci) in row"
                  :key="ci"
                  role="gridcell"
                  :aria-selected="iso ? iso === model : undefined"
                  class="p-0 text-center"
                >
                  <button
                    v-if="iso"
                    type="button"
                    :data-pick-day="iso"
                    :tabindex="iso === focusIso ? 0 : -1"
                    :aria-label="eyebrowDate(iso)"
                    :aria-current="iso === today ? 'date' : undefined"
                    class="mx-auto box-border flex size-11 items-center justify-center border-2 p-0 text-[0.9375rem] leading-none sm:size-10"
                    :class="dayClass(iso)"
                    @click="pick(iso)"
                  >
                    {{ Number(iso.slice(8)) }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="flex items-center justify-between gap-2 px-2 pt-1 sm:px-0">
            <button type="button" class="btn-pill h-11 px-3.5 text-[0.8125rem]" data-pick-none @click="pick('')">ไม่มีกำหนดส่ง</button>
            <button type="button" class="btn-pill h-11 px-3.5 text-[0.8125rem]" data-pick-today @click="pick(today)">วันนี้</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
