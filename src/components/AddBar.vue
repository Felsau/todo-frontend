<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAddForm } from '../composables/useAddForm'
import { PRIORITY_HEX, PRIORITY_LABEL } from '../types'
import { PAST_DATE_HINT, PAST_HINT_ID, isPastDate, today } from '../utils/date'
import { isBlank } from '../utils/text'
import AnchoredPicker from './AnchoredPicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'
import QuickDue from './QuickDue.vue'

/*
 * The add form: inline above the list from 640px, and inside the phone add sheet (sheet=true).
 * After adding, the cursor stays in the title box, so the next task can be typed at once, and
 * the chosen date and priority stay for it (QA round 4, P8).
 */
const props = defineProps<{ sheet?: boolean }>()

const { draft, due, priority, submit: send } = useAddForm()
const pastDue = computed(() => isPastDate(due.value, today.value))
const input = ref<HTMLInputElement | null>(null)

function submit() {
  if (send(props.sheet)) input.value?.focus()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <form
    class="relative flex flex-col gap-2.5 sm:gap-3 sm:rounded-2xl sm:border-2 sm:bg-white sm:p-3.5 sm:shadow-brutal"
    :class="pastDue && 'sm:pb-9'"
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

    <div class="flex flex-wrap items-end gap-2 sm:items-center sm:gap-x-4 sm:gap-y-2.5">
      <QuickDue v-model="due" />

      <div class="flex items-center gap-2">
        <span class="label" aria-hidden="true">ความสำคัญ</span>
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
    </div>
    <!-- Its own line that never moves the rows above: kept free in the phone sheet; from 640px a band opens at the bottom of the box only while the hint shows (recheck 2, M3; an always empty band looked like a broken box, owner check 2026-11-28). -->
    <p
      :id="PAST_HINT_ID"
      :data-past-hint="pastDue ? '' : undefined"
      class="m-0 text-[0.8125rem] leading-snug font-semibold text-danger max-sm:min-h-[1.3rem] sm:absolute sm:inset-x-4 sm:bottom-2.5"
    >
      {{ pastDue ? PAST_DATE_HINT : '' }}
    </p>
  </form>
</template>
