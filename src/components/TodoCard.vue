<script setup lang="ts">
import { computed } from 'vue'
import { useDetail } from '../composables/useDetail'
import { useListUi } from '../composables/useListUi'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_BG, PRIORITY_LABEL, type Todo } from '../types'
import { addDays, doneLabel, dueInfo, shortDate, today } from '../utils/date'
import Icon from './Icon.vue'

/*
 * One todo card. From 640px it is the block card of the desktop design: the title sits on the
 * toggle's line with pencil and bin at the right, and the priority and due chips under the
 * title, so a card is about 100px tall instead of 155px (QA round 3, UI 2). Below 640px it is
 * the single row of the mobile design (toggle, title and chips, chevron, bin).
 * Long titles stop after three lines; the full title shows on hover and in the detail (UI 12).
 * An overdue card offers to move it to today or tomorrow in one tap (QA round 4, owner decision 5)
 * with two small buttons on one short row (recheck, N5), and a search hit inside the note is shown under the title (U14).
 */
const props = defineProps<{ todo: Todo }>()
const { toggle, reschedule, remove, busy, locked } = useTodos()
const { tickMessage, noteHit } = useListUi()
const { openDetail } = useDetail()
const isSm = useIsSm()

const due = () => dueInfo(props.todo.due_date, props.todo.is_completed, today.value)
/** A toggle keeps one name; aria-pressed tells whether the task is done. */
const toggleLabel = () => `ทำเครื่องหมายว่าเสร็จ: ${props.todo.title}`

const onToggle = () => toggle(props.todo.id, { describe: tickMessage })
const overdue = computed(() => !!due()?.overdue)
const hit = computed(() => noteHit(props.todo))
/** A done card shows the day it was ticked, not the day it was due (QA round 4 recheck, N1). */
const finished = computed(() => (props.todo.is_completed ? doneLabel(props.todo.completed_at) : null))
/** A done card also keeps its due date, small and muted, so it shows when it was due (recheck 2, M2). */
const wasDue = computed(() => (finished.value && props.todo.due_date ? `กำหนด ${shortDate(props.todo.due_date)}` : null))
const moveToday = () => reschedule(props.todo.id, today.value, `ย้าย “${props.todo.title}” มาวันนี้แล้ว`)
const moveTomorrow = () => reschedule(props.todo.id, addDays(today.value, 1), `ย้าย “${props.todo.title}” ไปพรุ่งนี้แล้ว`)

/** detail 0 means the button was pressed with Enter or Space. */
const onRemove = (e: MouseEvent) => remove(props.todo.id, { keyboard: e.detail === 0 })

/** The card body opens the detail, unless the person was selecting text to copy (R2-22). */
function onBodyClick() {
  if (locked[props.todo.id]) return
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed && sel.toString().trim() !== '') return
  openDetail(props.todo.id)
}
</script>

<template>
  <!-- desktop and tablet card: toggle, title and buttons on the first line, chips under the title -->
  <li
    v-if="isSm"
    class="grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-2 gap-y-2 rounded-2xl border-2 px-3 pt-3 pb-3.5 motion-safe:transition motion-safe:duration-100"
    :class="
      todo.is_completed
        ? 'bg-white'
        : [PRIORITY_BG[todo.priority], 'shadow-brutal motion-safe:hover:-translate-0.5 motion-safe:hover:shadow-brutal-lg']
    "
    :data-todo-id="todo.id"
  >
    <button
      type="button"
      class="icon-btn"
      :aria-pressed="todo.is_completed"
      :aria-label="toggleLabel()"
      :aria-busy="busy[todo.id] || undefined"
      :disabled="locked[todo.id]"
      @click="onToggle"
    >
      <Icon v-if="busy[todo.id]" name="spinner" :size="22" :stroke="3" />
      <Icon v-else-if="todo.is_completed" name="check" :size="22" :stroke="3.5" />
    </button>

    <!-- The title and the chips also open the detail (the pencil is the keyboard path); their text can be selected. -->
    <span
      class="line-clamp-3 self-start pt-1.5 text-left text-[1.1875rem] leading-normal font-bold wrap-anywhere decoration-2"
      :class="[todo.is_completed && 'line-through', locked[todo.id] ? 'cursor-not-allowed' : 'cursor-pointer']"
      :title="todo.title"
      @click="onBodyClick"
    >
      {{ todo.title }}
    </span>

    <div class="flex flex-wrap justify-end gap-2 self-start">
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
        @click="onRemove"
      >
        <Icon name="trash" :size="20" :stroke="2.5" />
      </button>
    </div>

    <div
      class="col-start-2 col-end-4 flex flex-wrap items-end gap-1.5 self-stretch"
      :class="locked[todo.id] ? 'cursor-not-allowed' : 'cursor-pointer'"
      @click="onBodyClick"
    >
      <span class="box-border inline-flex min-h-7 items-center rounded-full border-2 bg-white px-2.5 text-[0.75rem] font-semibold whitespace-nowrap">
        {{ PRIORITY_LABEL[todo.priority] }}
      </span>
      <span
        v-if="finished"
        data-done-chip
        class="box-border inline-flex min-h-7 items-center gap-1.5 rounded-full border-2 bg-white px-2.5 text-[0.75rem] font-semibold whitespace-nowrap text-ink"
      >
        <Icon name="check" :size="13" :stroke="3.5" />
        {{ finished }}
      </span>
      <span
        v-if="wasDue"
        data-was-due-chip
        class="box-border inline-flex min-h-7 items-center rounded-full border-2 border-[#8a8780] bg-white px-2.5 text-[0.75rem] font-medium whitespace-nowrap text-[#555]"
      >
        {{ wasDue }}
      </span>
      <span
        v-else-if="due() && !finished"
        class="box-border inline-flex min-h-7 items-center gap-1.5 rounded-full border-2 px-2.5 text-[0.75rem] font-semibold whitespace-nowrap"
        :class="due()!.overdue ? 'bg-danger text-white' : 'bg-white text-ink'"
      >
        <Icon name="calendar" :size="13" :stroke="3" />
        {{ due()!.label }}
      </span>
    </div>

    <p v-if="hit" class="col-start-2 col-end-4 m-0 text-[0.8125rem] leading-normal font-medium wrap-anywhere text-[#333]" data-note-hit>
      เจอในโน้ต: {{ hit.before }}<mark class="rounded bg-accent px-0.5 text-ink">{{ hit.match }}</mark>{{ hit.after }}
    </p>

    <div v-if="overdue" class="col-start-2 col-end-4 flex flex-wrap items-center gap-2" data-move-row>
      <span aria-hidden="true" class="text-[0.75rem] font-semibold text-[#333]">ย้ายไป</span>
      <button type="button" class="btn-mini" :aria-label="`ย้าย ${todo.title} มาวันนี้`" :disabled="locked[todo.id]" @click="moveToday">วันนี้</button>
      <button type="button" class="btn-mini" :aria-label="`ย้าย ${todo.title} ไปพรุ่งนี้`" :disabled="locked[todo.id]" @click="moveTomorrow">พรุ่งนี้</button>
    </div>
  </li>

  <!-- mobile row -->
  <li
    v-else
    class="box-border flex min-h-17 flex-wrap items-center gap-1.5 rounded-[14px] border-2 p-1.5"
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
      @click="onToggle"
    >
      <Icon v-if="busy[todo.id]" name="spinner" :size="22" :stroke="3" />
      <Icon v-else-if="todo.is_completed" name="check" :size="22" :stroke="3.5" />
    </button>
    <!-- No aria-label: the name is "แก้ไข:" plus every word shown, so voice control can use what is on screen (UI 14). -->
    <button
      type="button"
      class="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-1.5 py-1 text-left disabled:cursor-not-allowed"
      :data-open-todo="todo.id"
      :disabled="locked[todo.id]"
      @click="openDetail(todo.id)"
    >
      <span class="sr-only">แก้ไข: </span>
      <span class="flex min-w-0 flex-1 flex-col gap-1">
        <span
          class="line-clamp-3 text-[1rem] leading-normal font-bold wrap-anywhere decoration-2"
          :class="todo.is_completed && 'line-through'"
          :title="todo.title"
        >
          {{ todo.title }}
        </span>
        <span class="flex flex-wrap items-center gap-1.5">
          <span class="box-border inline-flex min-h-7 items-center rounded-full border-2 bg-white px-2 text-[0.75rem] font-semibold whitespace-nowrap">
            {{ PRIORITY_LABEL[todo.priority] }}
          </span>
          <span
            v-if="finished"
            data-done-chip
            class="box-border inline-flex min-h-7 items-center gap-1 rounded-full border-2 bg-white px-2 text-[0.75rem] font-semibold whitespace-nowrap text-ink"
          >
            <Icon name="check" :size="12" :stroke="3.5" />
            {{ finished }}
          </span>
          <span
            v-if="wasDue"
            data-was-due-chip
            class="box-border inline-flex min-h-7 items-center rounded-full border-2 border-[#8a8780] bg-white px-2 text-[0.75rem] font-medium whitespace-nowrap text-[#555]"
          >
            {{ wasDue }}
          </span>
          <span
            v-else-if="due() && !finished"
            class="box-border inline-flex min-h-7 items-center gap-1 rounded-full border-2 px-2 text-[0.75rem] font-semibold whitespace-nowrap"
            :class="due()!.overdue ? 'bg-danger text-white' : 'bg-white text-ink'"
          >
            <Icon name="calendar" :size="12" :stroke="3" />
            {{ due()!.label }}
          </span>
        </span>
        <span v-if="hit" class="text-[0.8125rem] leading-normal font-medium wrap-anywhere text-[#333]" data-note-hit>
          เจอในโน้ต: {{ hit.before }}<mark class="rounded bg-accent px-0.5 text-ink">{{ hit.match }}</mark>{{ hit.after }}
        </span>
      </span>
      <Icon name="chevronRight" :size="16" :stroke="3" />
    </button>
    <button
      type="button"
      class="icon-btn"
      :aria-label="`ลบ: ${todo.title}`"
      :disabled="locked[todo.id]"
      @click="onRemove"
    >
      <Icon name="trash" :size="20" :stroke="2.5" />
    </button>
    <div v-if="overdue" class="flex w-full flex-wrap items-center gap-2 pb-0.5 pl-13" data-move-row>
      <span aria-hidden="true" class="text-[0.75rem] font-semibold text-[#333]">ย้ายไป</span>
      <button type="button" class="btn-mini" :aria-label="`ย้าย ${todo.title} มาวันนี้`" :disabled="locked[todo.id]" @click="moveToday">วันนี้</button>
      <button type="button" class="btn-mini" :aria-label="`ย้าย ${todo.title} ไปพรุ่งนี้`" :disabled="locked[todo.id]" @click="moveTomorrow">พรุ่งนี้</button>
    </div>
  </li>
</template>
