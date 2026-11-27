<script setup lang="ts">
import { computed } from 'vue'
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

/*
 * Shown instead of the skeleton when the first load is slow: the API host sleeps
 * when idle and takes about a minute to wake. Plain words for people, no server talk.
 */
const { waitedSec } = useTodos()
/** Eases towards 95% over about a minute, so the bar never claims to be done early. */
const progress = computed(() => Math.round(95 * (1 - Math.exp(-waitedSec.value / 25))))
const phrase = computed(() =>
  waitedSec.value < 20 ? 'แป๊บนึงนะ' : waitedSec.value < 45 ? 'กำลังมา ใกล้แล้ว' : 'อีกนิดเดียวจริงๆ',
)
</script>

<template>
  <section
    class="mx-auto mt-2 box-border flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-2 bg-white px-5 pt-7 pb-5 text-center shadow-brutal-lg sm:mt-6 sm:px-7"
  >
    <div aria-hidden="true" class="relative h-24 w-32">
      <div class="absolute top-3.5 left-1 h-15 w-24 -rotate-8 rounded-xl border-2 bg-low motion-safe:animate-bob"></div>
      <div
        class="absolute top-1.5 left-4.5 h-15 w-24 rotate-5 rounded-xl border-2 bg-high motion-safe:animate-bob"
        style="animation-delay: 0.2s"
      ></div>
      <div
        class="absolute top-6 left-3 box-border flex h-15 w-24 items-center justify-center rounded-xl border-2 bg-normal shadow-brutal motion-safe:animate-bob"
        style="animation-delay: 0.4s"
      >
        <Icon name="check" :size="30" :stroke="3" />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <h2 class="m-0 text-[20px] leading-snug font-bold sm:text-[22px]">กำลังเตรียมรายการงานของคุณ</h2>
      <p class="m-0 text-[14px] leading-relaxed font-medium text-[#333]">
        ถ้าไม่มีใครเปิดแอปมาสักพัก การเปิดครั้งแรกจะใช้เวลาราว 1 นาที ไม่ต้องรีเฟรชนะ รายการจะขึ้นมาเอง
      </p>
    </div>

    <div class="flex w-full flex-col gap-2">
      <div
        class="h-4.5 w-full overflow-hidden rounded-full border-2 bg-off"
        role="progressbar"
        aria-label="ความคืบหน้าการโหลดรายการ"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="stripes h-full border-r-2 bg-accent motion-safe:animate-stripes motion-safe:transition-[width] motion-safe:duration-1000"
          :class="progress === 0 ? 'border-r-0' : ''"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      <div class="flex items-center justify-between text-[13px] font-semibold">
        <span>{{ phrase }}</span>
        <span class="text-muted" aria-hidden="true">{{ waitedSec }} วินาที</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stripes {
  background-image: linear-gradient(
    -45deg,
    rgb(0 0 0 / 0.13) 25%,
    transparent 25%,
    transparent 50%,
    rgb(0 0 0 / 0.13) 50%,
    rgb(0 0 0 / 0.13) 75%,
    transparent 75%
  );
  background-size: 20px 20px;
}
</style>
