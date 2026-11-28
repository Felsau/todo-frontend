<script setup lang="ts">
import { useTodos } from '../composables/useTodos'
import WakeCard from './WakeCard.vue'

/*
 * Grey stand in while the list loads. It has the same blocks and heights as the real page
 * (add bar with its two option chips from 640px, four 44px filters, cards shaped like the real cards), so
 * nothing jumps when the tasks arrive (QA round 3, UI 11).
 */
const { waitedSec } = useTodos()
</script>

<template>
  <div v-if="waitedSec > 0" aria-busy="true" role="status" aria-live="polite">
    <WakeCard />
  </div>
  <div v-else class="flex flex-col gap-4 sm:gap-6" aria-busy="true" role="status" aria-live="polite">
    <!-- add bar (phones add through the round + button instead) -->
    <div
      class="flex flex-col max-sm:hidden gap-2.5 sm:gap-3 sm:rounded-2xl sm:border-2 sm:border-line sm:bg-white sm:p-3.5 sm:pb-9 sm:shadow-[4px_4px_0_var(--color-line)]"
    >
      <div class="flex gap-2 sm:gap-2.5">
        <div class="box-border h-13 flex-1 rounded-xl border-2 bg-white shadow-brutal-sm sm:h-13.5 sm:border-line sm:shadow-none"></div>
        <div class="h-13 w-21 rounded-xl bg-line sm:h-13.5 sm:w-26"></div>
      </div>
      <div class="flex gap-2 sm:gap-2.5">
        <div class="h-11 w-36 rounded-full bg-line"></div>
        <div class="h-11 w-26 rounded-full bg-line"></div>
      </div>
    </div>

    <!-- filters -->
    <div class="grid grid-cols-2 gap-2 sm:flex">
      <div v-for="w in ['sm:w-28', 'sm:w-34', 'sm:w-30', 'sm:w-29']" :key="w" class="h-11 rounded-full bg-line" :class="w"></div>
    </div>

    <!-- cards -->
    <div
      class="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] sm:gap-4.5 lg:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]"
    >
      <div
        v-for="w in [['80%', '40%'], ['65%', '30%'], ['72%', '35%']]"
        :key="w[0]"
        class="flex min-h-20 items-center gap-2.5 rounded-[14px] bg-line px-2.5 sm:min-h-24.5 sm:items-start sm:rounded-2xl sm:px-3.5 sm:pt-3.5"
      >
        <div class="size-9 shrink-0 rounded-[9px] bg-[#c9c5bc] sm:size-11 sm:rounded-[10px]"></div>
        <div class="flex flex-1 flex-col gap-1.5 sm:gap-3 sm:pt-2.5">
          <div class="h-2.5 rounded-[5px] bg-[#c9c5bc] sm:h-3.5" :style="{ width: w[0] }"></div>
          <div class="h-2 rounded bg-[#c9c5bc] sm:h-5 sm:rounded-full" :style="{ width: w[1] }"></div>
        </div>
      </div>
    </div>
    <p class="m-0 text-center text-[0.75rem] font-semibold text-muted">กำลังดึงรายการ...</p>
  </div>
</template>
