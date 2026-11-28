<script setup lang="ts">
import { computed } from 'vue'
import { awayFromThaiTime, timeText } from '../utils/date'
import AnchoredPicker from './AnchoredPicker.vue'
import Icon from './Icon.vue'
import ThaiTimePicker from './ThaiTimePicker.vue'

/*
 * "เวลา" pill that opens the app's time picker (a popover from 640px, a sheet on phones).
 * Always shown; the form sets the date to today when a time is picked without one.
 */
const props = withDefaults(defineProps<{ modelValue: string; past?: boolean; compact?: boolean }>(), { past: false, compact: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const away = awayFromThaiTime()
const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Same width as the ความสำคัญ label on phones, so the two pills line up (round 9, U12). -->
    <span v-if="!props.compact" class="label min-w-[4.25rem] sm:min-w-0" aria-hidden="true">เวลา</span>
    <AnchoredPicker label="เวลา">
      <template #trigger="{ triggerProps }">
        <button
          type="button"
          class="btn-pill gap-1.5 pr-3 pl-3"
          :class="props.past ? 'border-danger bg-[#ffe3e3] text-[#8f1d1d]' : props.modelValue ? 'bg-accent' : ''"
          v-bind="triggerProps"
          :aria-label="`เวลา${away ? ' (เวลาประเทศไทย)' : ''}: ${props.modelValue ? timeText(props.modelValue) : 'ไม่ระบุเวลา'}`"
          data-time-trigger
        >
          <Icon name="clock" :size="15" :stroke="2.6" />
          <span>{{ props.modelValue ? timeText(props.modelValue) : 'ไม่ระบุเวลา' }}</span>
          <Icon name="chevronDown" :size="14" :stroke="3" />
        </button>
      </template>
      <template #default="{ close }">
        <ThaiTimePicker v-model="value" @pick="close()" />
      </template>
    </AnchoredPicker>
  </div>
</template>
