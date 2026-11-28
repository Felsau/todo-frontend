<script setup lang="ts">
import { computed, useId } from 'vue'
import { QUICK_TIMES, awayFromThaiTime, timeText } from '../utils/date'
import Icon from './Icon.vue'

/*
 * The app's own time picker (24 hour, "น."), not the browser's time field, which some phones show
 * in English with AM/PM (the same reason the date picker is the app's own). Quick times close at
 * once; an hour keeps it open for the minutes; a minute closes it.
 */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; pick: [] }>()

const ids = { hours: useId(), minutes: useId() }
/** On a device not set to Thai time, say the times are Thai time (round 9, T10). */
const away = awayFromThaiTime()
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const hour = computed(() => props.modelValue.slice(0, 2))
const minute = computed(() => props.modelValue.slice(3, 5))

function set(v: string, close: boolean) {
  emit('update:modelValue', v)
  if (close) emit('pick')
}
const pickHour = (h: string) => set(`${h}:${minute.value || '00'}`, false)
const pickMinute = (m: string) => set(`${hour.value}:${m}`, true)

/**
 * Each grid is one Tab stop; arrow keys move inside it (6 columns), Home and End jump to the ends,
 * Enter or Space picks (round 9, U6).
 */
function gridKeys(e: KeyboardEvent) {
  const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 }
  const cells = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
  const i = cells.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  let next = i
  if (e.key in step) next = Math.min(cells.length - 1, Math.max(0, i + step[e.key]))
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = cells.length - 1
  else return
  e.preventDefault()
  cells[i].tabIndex = -1
  cells[next].tabIndex = 0
  cells[next].focus()
}
/** The cell that takes Tab: the chosen one, else the first. */
const hourStop = (h: string) => (hour.value ? hour.value === h : h === '00')
const minuteStop = (m: string) => (minute.value && hour.value ? minute.value === m : m === '00')

const cell =
  'box-border flex h-11 items-center justify-center rounded-xl border-2 text-[0.875rem] font-semibold tabular-nums'
</script>

<template>
  <div class="flex w-full flex-col gap-3 sm:w-[19.5rem]" data-time-picker>
    <div class="flex items-center justify-between gap-2">
      <!-- What is chosen now, not a second heading (the sheet already says เวลา; round 9). -->
      <p class="m-0 text-[0.875rem] font-semibold" aria-live="polite" data-time-value>
        <template v-if="props.modelValue">เลือกไว้ <span class="text-[1.125rem] font-bold">{{ timeText(props.modelValue) }}</span></template>
        <span v-else class="text-muted">ยังไม่ได้เลือกเวลา</span>
        <span v-if="away" class="block text-[0.75rem] text-muted" data-time-thai>เวลาประเทศไทย</span>
      </p>
      <button
        type="button"
        class="btn-pill h-9 px-3 text-[0.8125rem]"
        :aria-pressed="!props.modelValue"
        data-time-none
        @click="set('', true)"
      >
        ไม่ระบุเวลา
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2" role="group" aria-label="เวลาที่ใช้บ่อย">
      <button
        v-for="q in QUICK_TIMES"
        :key="q"
        type="button"
        :class="[cell, props.modelValue === q ? 'bg-accent shadow-brutal-sm' : 'bg-white']"
        :aria-pressed="props.modelValue === q"
        data-time-quick
        @click="set(q, true)"
      >
        {{ timeText(q) }}
      </button>
    </div>

    <div>
      <p :id="ids.hours" class="m-0 mb-1.5 text-[0.75rem] font-semibold text-muted">ชั่วโมง</p>
      <div class="grid grid-cols-6 gap-1.5" role="group" :aria-labelledby="ids.hours" @keydown="gridKeys">
        <button
          v-for="h in HOURS"
          :key="h"
          type="button"
          :class="[cell, hour === h ? 'bg-accent' : 'bg-white']"
          :aria-pressed="hour === h"
          :aria-label="`${Number(h)} นาฬิกา`"
          :tabindex="hourStop(h) ? 0 : -1"
          data-time-hour
          @click="pickHour(h)"
        >
          {{ h }}
        </button>
      </div>
    </div>

    <div>
      <p :id="ids.minutes" class="m-0 mb-1.5 text-[0.75rem] font-semibold text-muted">
        นาที<span v-if="!hour"> (เลือกชั่วโมงก่อน)</span>
      </p>
      <div class="grid grid-cols-6 gap-1.5" role="group" :aria-labelledby="ids.minutes" @keydown="gridKeys">
        <button
          v-for="m in MINUTES"
          :key="m"
          type="button"
          :class="[cell, hour && minute === m ? 'bg-accent' : 'bg-white', !hour && 'opacity-45']"
          :aria-pressed="!!hour && minute === m"
          :aria-label="`${Number(m)} นาที`"
          :tabindex="minuteStop(m) ? 0 : -1"
          :disabled="!hour"
          data-time-minute
          @click="pickMinute(m)"
        >
          {{ m }}
        </button>
      </div>
    </div>

    <!-- Always there, so the picker never changes height while choosing (round 9, U5). -->
    <button
      type="button"
      class="btn-primary h-11 gap-1.5"
      :class="!props.modelValue && 'opacity-45'"
      :disabled="!props.modelValue"
      data-time-done
      @click="emit('pick')"
    >
      <Icon v-if="props.modelValue" name="check" :size="16" :stroke="3" />
      {{ props.modelValue ? `ใช้เวลา ${timeText(props.modelValue)}` : 'เลือกชั่วโมงก่อน' }}
    </button>
  </div>
</template>
