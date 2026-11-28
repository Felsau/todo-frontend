<script setup lang="ts">
import { computed, useId } from 'vue'
import { PAST_HINT_ID, addDays, isPastDate, shortDate, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * One tap due dates for a new task: ไม่มีกำหนดส่ง, วันนี้, พรุ่งนี้, อีก 7 วัน and เลือกวัน, in one
 * row of the same shape, each date with the real date under it, so nobody has to work out what
 * "อีก 7 วัน" means. A new task still has no due date until one is tapped; the first option shows
 * that and takes the date off again (QA round 4, P7, P9, U4, owner decision 2; recheck, N6).
 */
const model = defineModel<string>({ required: true })
const labelId = useId()
const inputId = useId()
const hintId = PAST_HINT_ID

const quick = computed(() => [
  { value: today.value, label: 'วันนี้' },
  { value: addDays(today.value, 1), label: 'พรุ่งนี้' },
  { value: addDays(today.value, 7), label: 'อีก 7 วัน' },
])
/** A date that is none of the quick ones: the เลือกวัน button holds it. */
const custom = computed(() => !!model.value && !quick.value.some((o) => o.value === model.value))
const past = computed(() => isPastDate(model.value, today.value))

function choose(value: string) {
  model.value = value
}

function openPicker(e: Event) {
  try {
    ;(e.target as HTMLInputElement).showPicker?.()
  } catch {
    /* showPicker needs a user gesture; ignore when not allowed */
  }
}

const opt =
  'box-border flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl border-2 px-0.5 py-1 text-center leading-tight font-semibold whitespace-nowrap sm:min-h-11 sm:min-w-21 sm:px-2.5'
</script>

<template>
  <div role="group" :aria-labelledby="labelId" class="flex min-w-0 flex-col gap-1.5 max-sm:w-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
    <span :id="labelId" class="label">กำหนดส่ง</span>
    <div class="grid grid-cols-[1.25fr_1fr_1fr_1.1fr_1.1fr] gap-1.5 sm:flex sm:gap-2">
      <button
        type="button"
        :class="[opt, !model ? 'bg-accent shadow-brutal-sm' : 'bg-white']"
        :aria-pressed="!model"
        aria-label="ไม่มีกำหนดส่ง"
        data-due-none
        @click="choose('')"
      >
        <span class="text-[0.8125rem] max-[22.5rem]:text-[0.75rem]" aria-hidden="true">ไม่มี</span>
        <span class="text-[0.6875rem] text-[#333]" aria-hidden="true">กำหนดส่ง</span>
      </button>
      <button
        v-for="o in quick"
        :key="o.label"
        type="button"
        :class="[opt, model === o.value ? 'bg-accent shadow-brutal-sm' : 'bg-white']"
        :aria-pressed="model === o.value"
        :data-due-quick="o.label"
        @click="choose(o.value)"
      >
        <span class="text-[0.8125rem] max-[22.5rem]:text-[0.75rem]">{{ o.label }}</span>
        <span class="text-[0.6875rem] text-[#333]">{{ shortDate(o.value) }}</span>
      </button>
      <span
        class="relative focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus"
        :class="[opt, past ? 'border-danger bg-[#ffe3e3] text-[#8f1d1d]' : custom ? 'bg-accent shadow-brutal-sm' : 'bg-white']"
        :data-date-pill="custom ? 'selected' : undefined"
      >
        <span class="flex items-center gap-1 text-[0.8125rem] max-[22.5rem]:text-[0.75rem] whitespace-nowrap" aria-hidden="true">
          <Icon :name="custom ? 'check' : 'calendar'" :size="13" :stroke="custom ? 3.5 : 2.6" class="max-[22.5rem]:hidden" />
          เลือกวัน
        </span>
        <span class="text-[0.6875rem]" :class="!custom && 'text-[#333]'" aria-hidden="true">
          {{ custom ? shortDate(model) : 'วันอื่น' }}
        </span>
        <label :for="inputId" class="sr-only">เลือกวัน</label>
        <input
          :id="inputId"
          type="date"
          :value="custom ? model : ''"
          :aria-describedby="past ? hintId : undefined"
          class="absolute inset-0 size-full cursor-pointer text-[1rem] opacity-0"
          @click="openPicker"
          @keydown.enter.prevent="openPicker"
          @change="model = ($event.target as HTMLInputElement).value"
        />
      </span>
    </div>
  </div>
</template>
