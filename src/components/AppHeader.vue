<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useListUi } from '../composables/useListUi'
import { useTodos } from '../composables/useTodos'
import { eyebrowDate, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * One header for both views (design review R7): eyebrow, title, view switch,
 * done sticker and overdue sticker keep the same place on the list and the calendar.
 */
const { status, total, doneCount, overdueCount } = useTodos()
const { filter, searchOpen, toggleSearch } = useListUi()
const route = useRoute()
const router = useRouter()

const onList = computed(() => route.name === 'list')

function showOverdue() {
  filter.value = 'overdue'
  if (!onList.value) void router.push('/')
}

/** Opening search on a phone puts the cursor straight in the box (R2-16). */
async function onSearchToggle() {
  toggleSearch()
  if (!searchOpen.value) return
  await nextTick()
  document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
}

const navLink =
  'flex h-11 flex-1 items-center justify-center gap-2 px-5 text-[14px] font-semibold text-ink no-underline sm:flex-none aria-[current=page]:bg-ink aria-[current=page]:text-white'
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-x-3 gap-y-4 sm:gap-x-5">
    <div class="order-1 flex flex-col gap-0.5 sm:gap-1">
      <p class="m-0 text-[13px] leading-normal font-semibold text-muted">{{ eyebrowDate(today) }}</p>
      <h1 tabindex="-1" class="m-0 text-[40px] leading-[1.2] font-bold focus:outline-none lg:text-[56px]">ลุยงาน!</h1>
    </div>

    <nav
      aria-label="มุมมอง"
      class="order-3 flex w-full overflow-hidden rounded-full border-2 bg-white sm:order-2 sm:ml-auto sm:w-auto sm:shadow-brutal-sm"
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

    <div class="order-2 flex items-center gap-2.5 sm:order-3 sm:gap-3.5">
      <button
        v-if="onList && status === 'ready'"
        type="button"
        class="icon-btn rounded-xl sm:hidden"
        :class="searchOpen && 'bg-accent'"
        :aria-pressed="searchOpen"
        aria-label="ค้นหาและเรียงลำดับ"
        @click="onSearchToggle"
      >
        <Icon name="search" :size="20" />
      </button>

      <div
        v-if="status === 'loading'"
        aria-hidden="true"
        class="h-11.5 w-14.5 -rotate-4 rounded-[10px] border-2 border-dashed border-[#8a8780]"
      ></div>
      <div
        v-else-if="status === 'ready'"
        class="-rotate-4 rounded-xl border-2 bg-accent px-3 py-1.5 text-center shadow-brutal-sm sm:px-4 sm:py-2 sm:shadow-brutal"
      >
        <div class="text-[26px] leading-[1.2] font-bold sm:text-[30px]">{{ doneCount }}/{{ total }}</div>
        <div class="text-[12px] leading-tight font-bold">เสร็จแล้ว</div>
      </div>

      <button
        v-if="status === 'ready' && overdueCount > 0"
        type="button"
        class="hidden min-h-11 rotate-3 rounded-xl border-2 bg-danger px-4 py-2 text-center text-white shadow-brutal lg:block"
        :aria-label="`ดูงานเลยกำหนด ${overdueCount} รายการ`"
        @click="showOverdue"
      >
        <span class="block text-[30px] leading-[1.2] font-bold">{{ overdueCount }}</span>
        <span class="block text-[12px] leading-tight font-bold">เลยกำหนด</span>
      </button>
    </div>
  </header>
</template>
