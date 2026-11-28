<script setup lang="ts">
import { ref } from 'vue'
import { useAddForm } from '../composables/useAddForm'
import { PRIORITY_HEX, PRIORITY_LABEL } from '../types'
import { dueChipText, isPastDate, today } from '../utils/date'
import { isBlank } from '../utils/text'
import AnchoredPicker from './AnchoredPicker.vue'
import DuePicker from './DuePicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'

/*
 * The add form: inline above the list from 640px, and inside the phone add sheet (sheet=true).
 * After adding, the cursor stays in the title box, so the next task can be typed at once.
 */
const props = defineProps<{ sheet?: boolean }>()

const { draft, due, priority, submit: send } = useAddForm()
const input = ref<HTMLInputElement | null>(null)

function submit() {
  if (send(props.sheet)) input.value?.focus()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <form
    class="flex flex-col gap-2.5 sm:gap-3 sm:rounded-2xl sm:border-2 sm:bg-white sm:p-3.5 sm:shadow-brutal"
    @submit.prevent="submit"
  >
    <!-- Wraps only when the browser font size is very large, so the box keeps room for its text (UI 5). -->
    <div class="flex flex-wrap gap-2 sm:gap-2.5">
      <label for="new-todo" class="sr-only">รายการใหม่</label>
      <input
        id="new-todo"
        ref="input"
        v-model="draft"
        maxlength="200"
        autocomplete="off"
        placeholder="พิมพ์งานใหม่ตรงนี้"
        class="field box-border h-13 min-w-40 flex-1 text-[1rem] shadow-brutal-sm sm:h-13.5 sm:text-[1.0625rem] sm:shadow-none"
      />
      <button
        type="submit"
        class="btn-primary h-13 px-4.5 text-[0.9375rem] sm:h-13.5 sm:px-6 sm:text-[1rem]"
        :disabled="isBlank(draft)"
      >
        เพิ่ม +
      </button>
    </div>
    <p
      v-if="draft.length >= 170"
      class="m-0 -mt-1 text-[0.75rem] font-semibold"
      :class="draft.length >= 200 ? 'text-danger' : 'text-muted'"
      aria-live="polite"
    >
      {{ draft.length >= 200 ? 'ครบ 200 ตัวอักษรแล้ว เขียนต่อในโน้ตได้' : `เหลืออีก ${200 - draft.length} ตัวอักษร` }}
    </p>

    <div class="flex flex-wrap items-center gap-2 sm:gap-2.5">
      <AnchoredPicker label="กำหนดส่ง" panel-class="w-95 max-w-[80vw]">
        <template #trigger="{ triggerProps }">
          <!-- A date already gone turns the chip red before the task is added (UI 6). -->
          <button
            type="button"
            class="btn-pill gap-2 pr-3 pl-3.5"
            :class="isPastDate(due, today) && 'border-danger bg-[#ffe3e3] text-[#8f1d1d]'"
            v-bind="triggerProps"
            :aria-label="`กำหนดส่ง: ${dueChipText(due, today)}${isPastDate(due, today) ? ' เลยมาแล้ว' : ''}`"
          >
            <Icon name="calendar" :size="16" />
            <span>{{ dueChipText(due, today) }}<template v-if="isPastDate(due, today)"> เลยมาแล้ว</template></span>
            <Icon name="chevronDown" :size="14" :stroke="3" />
          </button>
        </template>
        <template #default="{ close }">
          <DuePicker v-model="due" @pick="close()" @done="close()" />
        </template>
      </AnchoredPicker>

      <AnchoredPicker label="ความสำคัญ">
        <template #trigger="{ triggerProps }">
          <button
            type="button"
            class="btn-pill gap-2 pr-3 pl-3.5"
            v-bind="triggerProps"
            :aria-label="`ความสำคัญ: ${PRIORITY_LABEL[priority]}`"
          >
            <span
              aria-hidden="true"
              class="box-border size-3 rounded-[3px] border-2"
              :style="{ background: PRIORITY_HEX[priority] }"
            ></span>
            <span>{{ PRIORITY_LABEL[priority] }}</span>
            <Icon name="chevronDown" :size="14" :stroke="3" />
          </button>
        </template>
        <template #default="{ close }">
          <PriorityPicker v-model="priority" @pick="close()" />
        </template>
      </AnchoredPicker>
    </div>
  </form>
</template>
