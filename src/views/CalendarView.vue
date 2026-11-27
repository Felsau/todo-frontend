<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import DayPanel from '../components/DayPanel.vue'
import Icon from '../components/Icon.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import LoadError from '../components/LoadError.vue'
import { useCalendarTodos } from '../composables/useCalendarTodos'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { WEEKDAY_SHORT, addDays, dayMonthLong, monthLabel, parseISO, startOfWeek, today, toISO, weekLabel } from '../utils/date'

/*
 * Calendar view. From 640px: a month grid (Sunday first) with a side panel.
 * Below 640px: a week strip with coloured dots and an agenda under it.
 */
const { status } = useTodos()
const { on, chipClass, dotClass } = useCalendarTodos()
const isSm = useIsSm()

const selected = ref(today.value)
/** First day of the month shown in the grid. */
const monthStart = ref(toISO(new Date(parseISO(today.value).getFullYear(), parseISO(today.value).getMonth(), 1)))
const weekStart = ref(startOfWeek(today.value))

function firstOfMonth(iso: string): string {
  const d = parseISO(iso)
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

/* ---------- month grid ---------- */

interface Cell {
  iso: string
  num: number
  inMonth: boolean
}

const cells = computed<Cell[]>(() => {
  const start = parseISO(monthStart.value)
  const first = start.getDay()
  const daysIn = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const count = Math.ceil((first + daysIn) / 7) * 7
  const out: Cell[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), 1 - first + i)
    out.push({ iso: toISO(d), num: d.getDate(), inMonth: d.getMonth() === start.getMonth() })
  }
  return out
})

/** Roving tabindex: one tab stop in the grid, arrow keys move between days. */
const focusIso = computed(() =>
  cells.value.some((c) => c.iso === selected.value) ? selected.value : (cells.value.find((c) => c.inMonth)?.iso ?? ''),
)

async function onCellKey(e: KeyboardEvent, c: Cell) {
  const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key]
  if (step === undefined) return
  e.preventDefault()
  const iso = addDays(c.iso, step)
  pickCell({ iso, num: 0, inMonth: true })
  await nextTick()
  document.querySelector<HTMLElement>(`[data-day="${iso}"]`)?.focus()
}

function shiftMonth(n: number) {
  const d = parseISO(monthStart.value)
  monthStart.value = toISO(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

/** Picking a day from another month switches the grid to that month. */
function pickCell(c: Cell) {
  selected.value = c.iso
  monthStart.value = firstOfMonth(c.iso)
  weekStart.value = startOfWeek(c.iso)
}

/* ---------- week strip ---------- */

const week = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))

function shiftWeek(n: number) {
  weekStart.value = addDays(weekStart.value, n * 7)
  selected.value = addDays(selected.value, n * 7)
  monthStart.value = firstOfMonth(selected.value)
}

function pickWeekDay(iso: string) {
  selected.value = iso
  monthStart.value = firstOfMonth(iso)
}

function goToday() {
  selected.value = today.value
  monthStart.value = firstOfMonth(today.value)
  weekStart.value = startOfWeek(today.value)
}

const heading = computed(() => (isSm.value ? monthLabel(monthStart.value) : weekLabel(weekStart.value)))
const countLabel = (iso: string) =>
  `${iso === today.value ? 'วันนี้ ' : ''}${dayMonthLong(iso)} มี ${on(iso).length} งาน`

const navBtn =
  'flex size-11 items-center justify-center rounded-xl border-2 bg-white p-0'
</script>

<template>
  <ListSkeleton v-if="status === 'loading'" />
  <LoadError v-else-if="status === 'error'" />

  <div v-else class="flex flex-wrap items-start gap-4 sm:gap-6">
    <section aria-label="ปฏิทิน" class="flex min-w-0 flex-[999_1_100%] flex-col gap-3 sm:flex-[3_1_560px]">
      <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <h2 aria-live="polite" class="m-0 text-[24px] leading-normal font-bold whitespace-nowrap sm:text-[28px]">
          {{ heading }}
        </h2>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            :class="navBtn"
            :aria-label="isSm ? 'เดือนก่อนหน้า' : 'สัปดาห์ก่อน'"
            @click="isSm ? shiftMonth(-1) : shiftWeek(-1)"
          >
            <Icon name="chevronLeft" :size="18" :stroke="3" />
          </button>
          <button type="button" class="btn-pill rounded-xl bg-accent px-3.5 shadow-brutal-sm sm:px-4" @click="goToday">
            วันนี้
          </button>
          <button
            type="button"
            :class="navBtn"
            :aria-label="isSm ? 'เดือนถัดไป' : 'สัปดาห์ถัดไป'"
            @click="isSm ? shiftMonth(1) : shiftWeek(1)"
          >
            <Icon name="chevronRight" :size="18" :stroke="3" />
          </button>
        </div>
      </div>

      <!-- desktop: month grid -->
      <template v-if="isSm">
        <div class="grid grid-cols-7 gap-2">
          <div v-for="w in WEEKDAY_SHORT" :key="w" class="py-1 text-center text-[13px] font-semibold">{{ w }}</div>
          <button
            v-for="c in cells"
            :key="c.iso"
            type="button"
            class="box-border flex min-h-26.5 min-w-0 flex-col items-stretch gap-1 rounded-xl border-2 p-1.5 text-left"
            :class="[
              c.iso === selected ? 'bg-sel shadow-brutal' : c.inMonth ? 'bg-white' : 'bg-off',
              !c.inMonth && c.iso !== selected && 'border-[#8a8780]',
            ]"
            :aria-pressed="c.iso === selected"
            :aria-current="c.iso === today ? 'date' : undefined"
            :aria-label="countLabel(c.iso)"
            :data-day="c.iso"
            :tabindex="c.iso === focusIso ? 0 : -1"
            @click="pickCell(c)"
            @keydown="onCellKey($event, c)"
          >
            <span
              class="box-border flex h-6.5 min-w-6.5 items-center justify-center self-start rounded-full border-2 px-1.5 text-[13px] font-semibold"
              :class="[
                c.iso === today ? 'border-ink bg-accent text-ink' : 'border-transparent',
                !c.inMonth && c.iso !== today && 'text-[#6b6862]',
              ]"
            >
              {{ c.num }}
            </span>
            <span
              v-for="t in on(c.iso).slice(0, 2)"
              :key="t.id"
              class="box-border block h-6 overflow-hidden rounded-md border-2 px-1.5 text-[12px] leading-5 font-semibold text-ellipsis whitespace-nowrap"
              :class="chipClass(t)"
              :title="t.title"
            >
              {{ t.title }}
            </span>
            <span v-if="on(c.iso).length > 2" class="pl-0.5 text-[12px] font-semibold">
              +{{ on(c.iso).length - 2 }} งาน
            </span>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-3.5 text-[12px] font-semibold">
          <span class="flex items-center gap-1.5">
            <span class="box-border size-4 rounded border-2 bg-high"></span>สำคัญมาก
          </span>
          <span class="flex items-center gap-1.5">
            <span class="box-border size-4 rounded border-2 bg-normal"></span>ปกติ
          </span>
          <span class="flex items-center gap-1.5">
            <span class="box-border size-4 rounded border-2 bg-low"></span>ไม่รีบ
          </span>
          <span class="flex items-center gap-1.5">
            <span class="box-border size-4 rounded border-2 bg-white"></span>เสร็จแล้ว
          </span>
          <span class="flex items-center gap-1.5">
            <span class="box-border size-4 rounded border-2 bg-danger"></span>เลยกำหนด
          </span>
        </div>
      </template>

      <!-- mobile: week strip -->
      <div v-else role="group" aria-label="เลือกวัน" class="grid grid-cols-7 gap-0.5 min-[380px]:gap-1.25">
        <button
          v-for="iso in week"
          :key="iso"
          type="button"
          class="box-border flex h-19 min-w-0 flex-col items-center justify-between rounded-xl border-2 py-1.5"
          :class="iso === selected ? 'bg-sel shadow-brutal-sm' : 'bg-white'"
          :aria-pressed="iso === selected"
          :aria-current="iso === today ? 'date' : undefined"
          :aria-label="countLabel(iso)"
          @click="pickWeekDay(iso)"
        >
          <span class="text-[12px] font-semibold">{{ WEEKDAY_SHORT[parseISO(iso).getDay()] }}</span>
          <span
            class="box-border flex size-6.5 items-center justify-center rounded-full border-2 text-[16px] leading-none font-semibold"
            :class="iso === today ? 'border-ink bg-accent' : 'border-transparent'"
          >
            {{ parseISO(iso).getDate() }}
          </span>
          <span class="flex h-2 gap-0.75">
            <span
              v-for="t in on(iso).slice(0, 3)"
              :key="t.id"
              class="box-border size-2 rounded-full border-[1.5px]"
              :class="dotClass(t)"
            ></span>
          </span>
        </button>
      </div>
    </section>

    <aside
      class="box-border flex min-w-0 flex-[1_1_100%] flex-col sm:flex-[1_1_360px] sm:rounded-2xl sm:border-2 sm:bg-white sm:p-4.5 sm:shadow-brutal"
    >
      <DayPanel :selected="selected" />
    </aside>
  </div>
</template>
