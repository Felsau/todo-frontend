<script setup lang="ts">
import { computed, useId } from 'vue'
import { QUICK_TIMES, timeText } from '../utils/date'
import Icon from './Icon.vue'

/*
 * The app's own time picker (24 hour, "น."), not the browser's time field, which some phones show
 * in English with AM/PM (the same reason the date picker is the app's own). Quick times close at
 * once; an hour keeps it open for the minutes; a minute closes it.
 */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; pick: [] }>()

const ids = { hours: useId(), minutes: useId() }
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

const cell =
  'box-border flex h-11 items-center justify-center rounded-xl border-2 text-[0.875rem] font-semibold tabular-nums'
</script>

<template>
  <div class="flex w-full flex-col gap-3 sm:w-[19.5rem]" data-time-picker>
    <div class="flex items-center justify-between gap-2">
      <p class="m-0 text-[1.125rem] font-bold" aria-live="polite" data-time-value>
        {{ props.modelValue ? timeText(props.modelValue) : 'เลือกเวลา' }}
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
      <div class="grid grid-cols-6 gap-1.5" role="group" :aria-labelledby="ids.hours">
        <button
          v-for="h in HOURS"
          :key="h"
          type="button"
          :class="[cell, hour === h ? 'bg-accent' : 'bg-white']"
          :aria-pressed="hour === h"
          :aria-label="`${Number(h)} นาฬิกา`"
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
      <div class="grid grid-cols-6 gap-1.5" role="group" :aria-labelledby="ids.minutes">
        <button
          v-for="m in MINUTES"
          :key="m"
          type="button"
          :class="[cell, hour && minute === m ? 'bg-accent' : 'bg-white', !hour && 'opacity-45']"
          :aria-pressed="!!hour && minute === m"
          :aria-label="`${Number(m)} นาที`"
          :disabled="!hour"
          data-time-minute
          @click="pickMinute(m)"
        >
          {{ m }}
        </button>
      </div>
    </div>

    <button v-if="props.modelValue" type="button" class="btn-primary h-11 gap-1.5" data-time-done @click="emit('pick')">
      <Icon name="check" :size="16" :stroke="3" />
      ใช้เวลา {{ timeText(props.modelValue) }}
    </button>
  </div>
</template>
