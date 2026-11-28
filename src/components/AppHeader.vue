<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { todayRequest } from '../composables/useCalendarTodos'
import { useListUi } from '../composables/useListUi'
import { useTodos } from '../composables/useTodos'
import { eyebrowDate, today } from '../utils/date'
import { focusHome } from '../utils/reveal'
import Icon from './Icon.vue'

/*
 * One header for both views (design review R7): eyebrow, title, the two stickers and the view
 * switch keep the same place on the list and the calendar.
 *
 * Yellow sticker = tasks due today only: "งานวันนี้ 1/3 เสร็จแล้ว", "3/3 ครบแล้ว!" or "ว่าง".
 * It is the same number as the calendar's today panel. Red sticker = overdue tasks, on every
 * screen size, the same number as the เลยกำหนด filter and group (QA round 4, P1, P2, P23, U1, U9).
 * Both are real buttons that take you to those tasks (U15).
 */
const { status, todayProgress, overdueCount } = useTodos()
const { filter, showAllByDue } = useListUi()
const route = useRoute()
const router = useRouter()

const onList = computed(() => route.name === 'list')

const allDone = computed(() => todayProgress.value.total > 0 && todayProgress.value.done === todayProgress.value.total)
const todayName = computed(() => {
  const { done, total } = todayProgress.value
  if (total === 0) return 'วันนี้ไม่มีงานที่ครบกำหนด ดูงานวันนี้'
  return `งานที่ครบกำหนดวันนี้ เสร็จ ${done} จาก ${total} งาน ดูงานวันนี้`
})

const smooth = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * On the list: back to ทั้งหมด sorted by ใกล้กำหนดก่อน, then to the วันนี้ group (the top when
 * there is none). On the calendar: select today.
 */
async function showToday() {
  if (!onList.value) {
    todayRequest.value++
    return
  }
  showAllByDue()
  await nextTick()
  const head = document.getElementById('group-today')
  if (!head) {
    window.scrollTo({ top: 0, behavior: smooth() ? 'smooth' : 'auto' })
    focusHome()
    return
  }
  head.scrollIntoView({ block: 'start', behavior: smooth() ? 'smooth' : 'auto' })
  head.focus({ preventScroll: true })
}

function showOverdue() {
  filter.value = 'overdue'
  if (!onList.value) void router.push('/')
  else void nextTick(() => window.scrollTo({ top: 0, behavior: smooth() ? 'smooth' : 'auto' }))
}

const navLink =
  'flex h-11 flex-1 items-center justify-center gap-2 px-5 text-[0.875rem] font-semibold text-ink no-underline sm:flex-none aria-[current=page]:bg-ink aria-[current=page]:text-white'
/* Both stickers share one size, so the header never moves when a count changes (owner decision 1). */
const sticker =
  'box-border flex min-h-[4.375rem] flex-col items-center justify-center rounded-xl border-2 px-2 py-1 text-center leading-tight font-bold shadow-brutal-sm sm:min-h-19 sm:px-4 sm:py-1.5 sm:shadow-brutal'
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-x-3 gap-y-4 sm:gap-x-5">
    <!-- On phones the date gets a line of its own, so the title and the stickers share the next one (UI 9). -->
    <div class="order-1 flex flex-col gap-0.5 max-sm:contents sm:gap-1">
      <p class="m-0 text-[0.8125rem] leading-normal font-semibold text-muted max-sm:order-0 max-sm:-mb-3.5 max-sm:w-full">
        {{ eyebrowDate(today) }}
      </p>
      <h1
        tabindex="-1"
        class="m-0 text-[2.5rem] leading-[1.2] font-bold focus:outline-none max-sm:order-1 max-[22.5rem]:text-[2.125rem] lg:text-[3.5rem]"
      >
        ลุยงาน!
      </h1>
    </div>

    <nav
      aria-label="มุมมอง"
      class="order-3 flex w-full overflow-hidden rounded-full border-2 bg-white sm:w-auto sm:shadow-brutal-sm"
    >
      <RouterLink to="/" :class="navLink">
        <Icon name="list" :size="18" class="hidden sm:block" />
        รายการ
      </RouterLink>
      <RouterLink to="/calendar" :class="navLink">
        <Icon name="calendarGrid" :size="18" class="hidden sm:block" />
        ปฏิทิน
      </RouterLink>
    </nav>

    <!-- Stickers come before the view switch, so the switch stays put at the right edge (UI 9). -->
    <div class="order-2 flex items-stretch gap-1.5 max-sm:ml-auto sm:ml-auto sm:gap-3.5" data-stickers>
      <template v-if="status === 'loading'">
        <div aria-hidden="true" class="-rotate-4 border-dashed border-[#8a8780] shadow-none! min-w-16 sm:min-w-21" :class="sticker"></div>
      </template>
      <template v-else-if="status === 'ready'">
        <button
          type="button"
          data-today-sticker
          :aria-label="todayName"
          class="min-w-16 -rotate-4 bg-accent sm:min-w-21"
          :class="sticker"
          @click="showToday"
        >
          <span class="block text-[0.6875rem] sm:text-[0.75rem]">งานวันนี้</span>
          <template v-if="todayProgress.total > 0">
            <span class="block text-[1.5rem] leading-[1.15] sm:text-[1.75rem]">{{ todayProgress.done }}/{{ todayProgress.total }}</span>
            <span class="block text-[0.6875rem] sm:text-[0.75rem]">{{ allDone ? 'ครบแล้ว!' : 'เสร็จแล้ว' }}</span>
          </template>
          <template v-else>
            <span class="block text-[1.5rem] leading-[1.15] sm:text-[1.75rem]">ว่าง</span>
            <!-- keeps the same height as the other states -->
            <span class="invisible block text-[0.6875rem] sm:text-[0.75rem]" aria-hidden="true">เสร็จแล้ว</span>
          </template>
        </button>

        <button
          v-if="overdueCount > 0"
          type="button"
          data-overdue-sticker
          class="min-w-14 rotate-3 bg-danger text-white sm:min-w-19"
          :class="sticker"
          :aria-label="`ดูงานเลยกำหนด ${overdueCount} งาน`"
          @click="showOverdue"
        >
          <span class="block text-[1.5rem] leading-[1.15] sm:text-[1.75rem]">{{ overdueCount }}</span>
          <span class="block text-[0.6875rem] sm:text-[0.75rem]">เลยกำหนด</span>
        </button>
      </template>
    </div>
  </header>
</template>
