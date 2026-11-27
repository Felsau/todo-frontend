<script setup lang="ts">
import { useId } from 'vue'
import { dueOptions, fullShortDate, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * The one due-date picker used by the add bar and the detail dialog:
 * วันนี้ / พรุ่งนี้ / อีก 7 วัน / ไม่มีกำหนดส่ง plus a "เลือกวัน" date input.
 * The native date input shows the browser's own format (often mm/dd/yyyy and the
 * Christian year), so it sits invisible over a Thai label and opens its calendar on click.
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

function openPicker(e: Event) {
  try {
    ;(e.target as HTMLInputElement).showPicker?.()
  } catch {
    /* showPicker needs a user gesture; ignore when not allowed */
  }
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
        <span
          class="relative box-border flex h-11 items-center gap-2 rounded-full border-2 bg-white px-3.5 text-[13px] font-semibold focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus"
        >
          <Icon name="calendar" :size="15" />
          <span aria-hidden="true">{{ props.modelValue ? fullShortDate(props.modelValue) : 'เลือกวัน' }}</span>
          <input
            :id="inputId"
            type="date"
            :value="props.modelValue"
            class="absolute inset-0 cursor-pointer text-[16px] opacity-0"
            @click="openPicker"
            @keydown.enter.prevent="openPicker"
            @change="onDate"
          />
        </span>
      </template>
    </div>
    <div v-if="props.variant === 'panel'" class="flex items-center gap-2.5">
      <label :for="inputId" class="label">เลือกวัน</label>
      <span
        class="relative box-border flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] border-2 bg-white px-2.5 text-[14px] font-semibold focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus"
      >
        <Icon name="calendar" :size="16" />
        <span aria-hidden="true" :class="!props.modelValue && 'text-muted'">
          {{ props.modelValue ? fullShortDate(props.modelValue) : 'กดเพื่อเลือกวัน' }}
        </span>
        <input
          :id="inputId"
          type="date"
          :value="props.modelValue"
          class="absolute inset-0 cursor-pointer text-[16px] opacity-0"
          @click="openPicker"
          @change="onDate"
          @keydown.enter.prevent="emit('done')"
        />
      </span>
      <button type="button" class="btn-pill" @click="emit('done')">เสร็จ</button>
    </div>
  </div>
</template>
