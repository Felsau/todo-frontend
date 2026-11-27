<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useListUi } from '../composables/useListUi'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_HEX, PRIORITY_LABEL, type Priority } from '../types'
import { dueChipText, today } from '../utils/date'
import { revealCard } from '../utils/reveal'
import { isBlank } from '../utils/text'
import AnchoredPicker from './AnchoredPicker.vue'
import DuePicker from './DuePicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'

const { add } = useTodos()
const { filter, query } = useListUi()

const draft = ref('')
const due = ref('')
const priority = ref<Priority>('normal')
const input = ref<HTMLInputElement | null>(null)

function submit() {
  const title = draft.value.trim()
  if (isBlank(title)) return
  const sent = { title, due: due.value, priority: priority.value }
  add(
    { title, priority: sent.priority, due_date: sent.due || null },
    {
      // A failed add puts the typed values back, unless the box is already in use again (R2-05).
      restore: () => {
        if (draft.value.trim() !== '') return false
        draft.value = sent.title
        due.value = sent.due
        priority.value = sent.priority
        return true
      },
      // "ดูงาน": make sure no filter or search hides the new card, then go to it (R2-02).
      reveal: (id) => {
        filter.value = 'all'
        query.value = ''
        void nextTick(() => revealCard(id))
      },
    },
  )
  draft.value = ''
  due.value = ''
  priority.value = 'normal'
  input.value?.focus()
}
</script>

<template>
  <form
    class="flex flex-col gap-2.5 sm:gap-3 sm:rounded-2xl sm:border-2 sm:bg-white sm:p-3.5 sm:shadow-brutal"
    @submit.prevent="submit"
  >
    <div class="flex gap-2 sm:gap-2.5">
      <label for="new-todo" class="sr-only">รายการใหม่</label>
      <input
        id="new-todo"
        ref="input"
        v-model="draft"
        maxlength="200"
        autocomplete="off"
        placeholder="พิมพ์งานใหม่ตรงนี้"
        class="field box-border h-13 min-w-0 flex-1 text-[16px] shadow-brutal-sm sm:h-13.5 sm:text-[17px] sm:shadow-none"
      />
      <button
        type="submit"
        class="btn-primary h-13 px-4.5 text-[15px] sm:h-13.5 sm:px-6 sm:text-[16px]"
        :disabled="isBlank(draft)"
      >
        เพิ่ม +
      </button>
    </div>
    <p
      v-if="draft.length >= 170"
      class="m-0 -mt-1 text-[12px] font-semibold"
      :class="draft.length >= 200 ? 'text-danger' : 'text-muted'"
      aria-live="polite"
    >
      {{ draft.length >= 200 ? 'ครบ 200 ตัวอักษรแล้ว เขียนต่อในโน้ตได้' : `เหลืออีก ${200 - draft.length} ตัวอักษร` }}
    </p>

    <div class="flex flex-wrap items-center gap-2 sm:gap-2.5">
      <AnchoredPicker label="กำหนดส่ง" panel-class="w-95 max-w-[80vw]">
        <template #trigger="{ triggerProps }">
          <button
            type="button"
            class="btn-pill gap-2 pr-3 pl-3.5"
            v-bind="triggerProps"
            :aria-label="`กำหนดส่ง: ${dueChipText(due, today)}`"
          >
            <Icon name="calendar" :size="16" />
            <span>{{ dueChipText(due, today) }}</span>
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
