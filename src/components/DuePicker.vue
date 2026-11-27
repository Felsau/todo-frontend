<script setup lang="ts">
import { useId } from 'vue'
import { dueOptions, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * The one due-date picker used by the add bar and the detail dialog:
 * วันนี้ / พรุ่งนี้ / +7 วัน / ไม่มีกำหนด plus a "เลือกวัน" date input.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    /** panel: a visible "เลือกวัน" label and a done button. inline: a pill input in the chip row. */
    variant?: 'panel' | 'inline'
  }>(),
  { variant: 'panel' },
)
const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** A quick option was chosen. */
  pick: [value: string]
  /** The user is finished with the date input (Enter or the done button). */
  done: []
}>()

const inputId = useId()

function onDate(e: Event) {
  // Keep the picker open while typing: a keyboard-typed date fires change early (review R11).
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

function choose(value: string) {
  emit('update:modelValue', value)
  emit('pick', value)
}
</script>

<template>
  <div :class="props.variant === 'panel' ? 'flex flex-col gap-3' : 'contents'">
    <div class="flex flex-wrap items-center gap-2" :class="props.variant === 'inline' && 'w-full'">
      <button
        v-for="o in dueOptions(today)"
        :key="o.label"
        type="button"
        class="opt"
        :aria-pressed="props.modelValue === o.value"
        @click="choose(o.value)"
      >
        <Icon v-if="props.modelValue === o.value" name="check" :size="14" :stroke="3.5" />
        {{ o.label }}
      </button>
      <template v-if="props.variant === 'inline'">
        <label :for="inputId" class="sr-only">เลือกวัน</label>
        <input
          :id="inputId"
          type="date"
          :value="props.modelValue"
          class="box-border h-11 rounded-full border-2 bg-white px-3 text-[13px] font-semibold"
          @change="onDate"
        />
      </template>
    </div>
    <div v-if="props.variant === 'panel'" class="flex items-center gap-2.5">
      <label :for="inputId" class="label">เลือกวัน</label>
      <input
        :id="inputId"
        type="date"
        :value="props.modelValue"
        class="box-border h-11 min-w-0 flex-1 rounded-[10px] border-2 bg-white px-2.5 text-[14px] font-semibold"
        @change="onDate"
        @keydown.enter.prevent="emit('done')"
      />
      <button type="button" class="btn-pill" @click="emit('done')">เสร็จ</button>
    </div>
  </div>
</template>
