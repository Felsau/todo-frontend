<script setup lang="ts">
import { useDetail } from '../composables/useDetail'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_BG, PRIORITY_LABEL, type Todo } from '../types'
import { dueInfo, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * One todo card. From 640px it is the block card of the desktop design
 * (toggle, priority pill, pencil, bin, title, due chip). Below 640px it is the
 * single row of the mobile design (toggle, title and meta, chevron, bin).
 */
const props = defineProps<{ todo: Todo }>()
const { toggle, remove, busy, locked } = useTodos()
const { openDetail } = useDetail()
const isSm = useIsSm()

const due = () => dueInfo(props.todo.due_date, props.todo.is_completed, today.value)
const toggleLabel = () =>
  `${props.todo.is_completed ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายว่าเสร็จ'}: ${props.todo.title}`
</script>

<template>
  <!-- desktop and tablet card -->
  <li
    v-if="isSm"
    class="flex flex-col gap-3 rounded-2xl border-2 px-3 pt-3 pb-3.5 motion-safe:transition motion-safe:duration-100"
    :class="
      todo.is_completed
        ? 'bg-white'
        : [PRIORITY_BG[todo.priority], 'shadow-brutal motion-safe:hover:-translate-0.5 motion-safe:hover:shadow-brutal-lg']
    "
    :data-todo-id="todo.id"
  >
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="icon-btn"
        :aria-pressed="todo.is_completed"
        :aria-label="toggleLabel()"
        :aria-busy="busy[todo.id] || undefined"
        :disabled="locked[todo.id]"
        @click="toggle(todo.id)"
      >
        <Icon v-if="busy[todo.id]" name="spinner" :size="22" :stroke="3" />
        <Icon v-else-if="todo.is_completed" name="check" :size="22" :stroke="3.5" />
      </button>
      <span class="box-border inline-flex h-7 items-center rounded-full border-2 bg-white px-2.5 text-[12px] font-semibold">
        {{ PRIORITY_LABEL[todo.priority] }}
      </span>
      <span class="flex-1"></span>
      <button
        type="button"
        class="icon-btn"
        :aria-label="`แก้ไข: ${todo.title}`"
        :data-open-todo="todo.id"
        :disabled="locked[todo.id]"
        @click="openDetail(todo.id)"
      >
        <Icon name="pencil" :size="20" :stroke="2.5" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="`ลบ: ${todo.title}`"
        :disabled="locked[todo.id]"
        @click="remove(todo.id)"
      >
        <Icon name="trash" :size="20" :stroke="2.5" />
      </button>
    </div>

    <!-- The whole card body also opens the detail; the pencil is the keyboard path. -->
    <button
      type="button"
      tabindex="-1"
      class="flex min-h-11 flex-1 cursor-pointer flex-col gap-3 border-0 bg-transparent px-1 py-0 text-left disabled:cursor-not-allowed"
      :disabled="locked[todo.id]"
      @click="openDetail(todo.id)"
    >
      <span
        class="text-[19px] leading-normal font-bold wrap-anywhere decoration-2"
        :class="todo.is_completed && 'line-through'"
      >
        {{ todo.title }}
      </span>
      <span
        v-if="due()"
        class="mt-auto box-border inline-flex h-7 items-center gap-1.5 self-start rounded-full border-2 px-2.5 text-[12px] font-semibold"
        :class="due()!.overdue ? 'bg-danger text-white' : 'bg-white text-ink'"
      >
        <Icon name="calendar" :size="13" :stroke="3" />
        {{ due()!.label }}
      </span>
    </button>
  </li>

  <!-- mobile row -->
  <li
    v-else
    class="box-border flex min-h-17 items-center gap-1.5 rounded-[14px] border-2 p-1.5"
    :class="todo.is_completed ? 'bg-white' : [PRIORITY_BG[todo.priority], 'shadow-brutal']"
    :data-todo-id="todo.id"
  >
    <button
      type="button"
      class="icon-btn"
      :aria-pressed="todo.is_completed"
      :aria-label="toggleLabel()"
      :aria-busy="busy[todo.id] || undefined"
      :disabled="locked[todo.id]"
      @click="toggle(todo.id)"
    >
      <Icon v-if="busy[todo.id]" name="spinner" :size="22" :stroke="3" />
      <Icon v-else-if="todo.is_completed" name="check" :size="22" :stroke="3.5" />
    </button>
    <button
      type="button"
      class="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-1.5 py-1 text-left disabled:cursor-not-allowed"
      :aria-label="`แก้ไข: ${todo.title}`"
      :data-open-todo="todo.id"
      :disabled="locked[todo.id]"
      @click="openDetail(todo.id)"
    >
      <span class="flex min-w-0 flex-1 flex-col gap-1">
        <span
          class="text-[16px] leading-normal font-bold wrap-anywhere decoration-2"
          :class="todo.is_completed && 'line-through'"
        >
          {{ todo.title }}
        </span>
        <span class="flex flex-wrap items-center gap-1.5">
          <span
            v-if="due()"
            class="box-border inline-flex h-6 items-center rounded-full border-2 px-2 text-[12px] font-semibold"
            :class="due()!.overdue ? 'bg-danger text-white' : 'bg-white text-ink'"
          >
            {{ due()!.label }}
          </span>
          <span class="text-[12px] font-semibold">{{ PRIORITY_LABEL[todo.priority] }}</span>
        </span>
      </span>
      <Icon name="chevronRight" :size="16" :stroke="3" />
    </button>
    <button
      type="button"
      class="icon-btn"
      :aria-label="`ลบ: ${todo.title}`"
      :disabled="locked[todo.id]"
      @click="remove(todo.id)"
    >
      <Icon name="trash" :size="20" :stroke="2.5" />
    </button>
  </li>
</template>
