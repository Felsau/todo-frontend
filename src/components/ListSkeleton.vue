<script setup lang="ts">
import { computed } from 'vue'
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

const { waitedSec } = useTodos()
/** Eases towards 95% over about a minute, so the bar never claims to be done early. */
const progress = computed(() => Math.round(95 * (1 - Math.exp(-waitedSec.value / 25))))
</script>

<template>
  <div class="flex flex-col gap-3.5" aria-busy="true" role="status" aria-live="polite">
    <section
      v-if="waitedSec > 0"
      class="box-border flex flex-col gap-2.5 rounded-2xl border-2 bg-white px-4 py-4.5 shadow-brutal sm:max-w-xl"
    >
      <div class="flex items-center gap-3">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 bg-accent">
          <Icon name="spinner" :size="22" :stroke="3" />
        </div>
        <h2 class="m-0 text-[18px] leading-normal font-bold">กำลังปลุกเซิร์ฟเวอร์</h2>
      </div>
      <p class="m-0 text-[13px] leading-normal font-medium text-[#333]">
        เซิร์ฟเวอร์ใช้แพ็กเกจฟรีที่จะหลับเมื่อไม่มีคนใช้สักพัก การเปิดครั้งแรกจึงอาจใช้เวลาราว 1 นาที รอสักครู่นะ เดี๋ยวรายการจะขึ้นมาเอง
      </p>
      <div
        class="h-3.5 overflow-hidden rounded-full border-2 bg-off"
        role="progressbar"
        aria-label="ความคืบหน้าการปลุกเซิร์ฟเวอร์"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="h-full bg-accent motion-safe:transition-[width] motion-safe:duration-1000" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="m-0 text-[12px] font-semibold text-muted" aria-hidden="true">รอมาแล้ว {{ waitedSec }} วินาที</p>
    </section>
    <div class="box-border h-13 rounded-xl border-2 bg-white shadow-brutal-sm"></div>
    <div class="flex gap-1.5">
      <div class="h-8 w-18 rounded-full bg-line"></div>
      <div class="h-8 w-14 rounded-full bg-line"></div>
      <div class="h-8 w-17 rounded-full bg-line"></div>
    </div>
    <div class="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:gap-4.5 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
      <div
        v-for="w in [['80%', '40%'], ['65%', '30%'], ['72%', '35%']]"
        :key="w[0]"
        class="flex min-h-15.5 items-center gap-2.5 rounded-[14px] bg-line px-2.5 sm:min-h-34"
      >
        <div class="size-9 shrink-0 rounded-[9px] bg-[#c9c5bc]"></div>
        <div class="flex flex-1 flex-col gap-1.5">
          <div class="h-2.5 rounded-[5px] bg-[#c9c5bc]" :style="{ width: w[0] }"></div>
          <div class="h-2 rounded bg-[#c9c5bc]" :style="{ width: w[1] }"></div>
        </div>
      </div>
    </div>
    <p v-if="waitedSec === 0" class="m-0 mt-1 text-center text-[12px] font-semibold text-muted">กำลังดึงรายการ...</p>
  </div>
</template>
