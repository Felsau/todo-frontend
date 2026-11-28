<script setup lang="ts">
import { computed, useId } from 'vue'
import { dueOptions, pastEditHint, fullShortDate, isPastDate, shortDate, today } from '../utils/date'
import Icon from './Icon.vue'
import ThaiDatePicker from './ThaiDatePicker.vue'

/*
 * The due-date picker of the detail dialog: วันนี้ / พรุ่งนี้ / อีก 7 วัน / ไม่มีกำหนดส่ง plus a
 * "เลือกวัน" pill that opens the app's Thai calendar (Buddhist year), not the browser's own.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    /** The task is already done, so a past date will not make it overdue. */
    done?: boolean
    /** The date the task has now: no "you picked a past date" hint for it (round 6, M3). */
    saved?: string
  }>(),
  { done: false, saved: undefined },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hintId = useId()
const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

/** A date already gone: allowed, but say it will be overdue at once (UI 6). */
const past = computed(() => !props.done && isPastDate(props.modelValue, today.value))
/** The hint only for a past date picked just now; the saved one has the red move box (round 6, M3). */
const pastHint = computed(() => past.value && props.modelValue !== props.saved)
/** A picked date that is none of the quick options: the date pill is the selected one (UI 13). */
const custom = computed(() => !!props.modelValue && !dueOptions(today.value).some((o) => o.value === props.modelValue))
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-2">
    <button
      v-for="o in dueOptions(today)"
      :key="o.label"
      type="button"
      class="opt"
      :aria-pressed="props.modelValue === o.value"
      @click="value = o.value"
    >
      <Icon v-if="props.modelValue === o.value" name="check" :size="14" :stroke="3.5" />
      {{ o.label }}
      <!-- The real date, so "อีก 7 วัน" reads as one day and not a span of days (QA round 4, P9). -->
      <span v-if="o.value" class="font-medium text-[#333]">{{ shortDate(o.value) }}</span>
    </button>
    <ThaiDatePicker v-model="value">
      <template #trigger="{ triggerProps }">
        <button
          type="button"
          v-bind="triggerProps"
          class="box-border flex h-11 items-center gap-2 rounded-full border-2 px-3.5 text-[0.8125rem] font-semibold"
          :class="past ? 'border-danger bg-[#ffe3e3] text-[#8f1d1d]' : custom ? 'bg-accent' : 'bg-white'"
          :data-date-pill="custom ? 'selected' : undefined"
          :aria-label="custom ? `เลือกวัน ${fullShortDate(props.modelValue)}` : 'เลือกวันอื่น'"
          :aria-describedby="pastHint ? hintId : undefined"
        >
          <Icon v-if="custom" name="check" :size="14" :stroke="3.5" />
          <Icon v-else name="calendar" :size="15" />
          <!-- A date that a quick option already shows is not repeated here (round 6, L1). -->
          <span aria-hidden="true">{{ custom ? fullShortDate(props.modelValue) : 'เลือกวันอื่น' }}</span>
        </button>
      </template>
    </ThaiDatePicker>
    <p v-if="pastHint" :id="hintId" data-past-hint class="m-0 w-full text-[0.8125rem] leading-normal font-semibold text-danger">
      {{ pastEditHint(props.modelValue, isPastDate(props.saved ?? '', today)) }}
    </p>
  </div>
</template>
