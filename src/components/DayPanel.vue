<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalendarTodos } from '../composables/useCalendarTodos'
import { useDetail } from '../composables/useDetail'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_BG, PRIORITY_HEX, PRIORITY_LABEL, type Priority, type Todo } from '../types'
import { dayMonthLong, diffDays, doneLabel, isOverdue, isPastDate, shortDate, today, weekdayName } from '../utils/date'
import { isBlank } from '../utils/text'
import AnchoredPicker from './AnchoredPicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'

/*
 * The selected day: its add form and its tasks (side panel on desktop, agenda on mobile).
 * Desktop also lists undated todos; mobile adds the next few tasks after the day and the undated
 * ones. Those extra lists sit in their own boxes under a heading that says they are not tasks of
 * the selected day, and can be ticked there too (QA round 4, P19).
 */
const props = defineProps<{ selected: string }>()

const { todos, add, toggle, remove, busy, locked } = useTodos()
const { on, undated } = useCalendarTodos()
const { openDetail } = useDetail()
const isSm = useIsSm()

const dayTasks = computed(() => on(props.selected))
const nice = computed(() => shortDate(props.selected))
const offset = computed(() => diffDays(today.value, props.selected))
/** Adding to a day already gone makes an overdue task: allowed, but said up front (UI 6). */
const past = computed(() => isPastDate(props.selected, today.value))

const eyebrow = computed(() => {
  const d = offset.value
  if (d === 0) return 'วันนี้'
  if (d === 1) return 'พรุ่งนี้'
  if (d === -1) return 'เมื่อวาน'
  return d > 0 ? `อีก ${d} วัน` : `${-d} วันก่อน`
})
/** The year only when it is not this year, as the add box already shows it (round 6, L10). */
const yearText = computed(() => {
  const y = props.selected.slice(0, 4)
  return y === today.value.slice(0, 4) ? '' : ` ${Number(y) + 543}`
})
const title = computed(() =>
  isSm.value
    ? `วัน${weekdayName(props.selected)}ที่ ${dayMonthLong(props.selected)}${yearText.value}`
    : `${weekdayName(props.selected)} ${nice.value}`,
)
const countText = computed(() => {
  const list = dayTasks.value
  return list.length ? `เสร็จ ${list.filter((t) => t.is_completed).length} จาก ${list.length} งาน` : ''
})
const emptyText = computed(() =>
  offset.value === 0 ? 'วันนี้ยังไม่มีงาน เพิ่มงานด้านบนได้เลย' : `วันที่ ${nice.value} ยังไม่มีงาน เพิ่มงานด้านบนได้เลย`,
)

const allUpcoming = computed(() =>
  todos.value
    .filter((t) => !t.is_completed && t.due_date && t.due_date > props.selected)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : 0)),
)
/** Only the first three; the heading says so when there are more (round 6, L6). */
const upcoming = computed(() => allUpcoming.value.slice(0, 3))
/**
 * Picking a past day: the warning waits until something is typed, and says it is about the task
 * being added, not the tasks listed below (round 6, M2).
 */
const pastHint = computed(() =>
  past.value && !isBlank(draft.value) ? `วันที่ ${nice.value} ผ่านมาแล้ว งานที่เพิ่มลงวันนั้นจะขึ้นว่าเลยกำหนดทันที` : '',
)

/* add form: the new todo gets the selected day as its due date */
const draft = ref('')
const priority = ref<Priority>('normal')
const input = ref<HTMLInputElement | null>(null)

function submit() {
  const t = draft.value.trim()
  if (isBlank(t)) return
  const sent = { title: t, priority: priority.value }
  const id = add(
    { title: t, priority: sent.priority, due_date: props.selected },
    {
      // A failed add puts the typed values back, unless the box is already in use again (R2-05).
      restore: () => {
        if (draft.value.trim() !== '') return false
        draft.value = sent.title
        priority.value = sent.priority
        return true
      },
    },
  )
  if (id === undefined) return // not added (no internet): the text stays
  // The priority stays for the next task of this day; it starts fresh when you leave the calendar (P8).
  draft.value = ''
  input.value?.focus()
}

const overdue = (t: Todo) => isOverdue(t.due_date, t.is_completed, today.value)
/* The boxes for tasks that are not of the selected day: dashed, on the paper colour. */
const box = 'flex flex-col gap-2 rounded-2xl border-2 border-dashed bg-paper p-2.5 sm:bg-off'
const row = 'box-border flex items-center gap-1.5 rounded-xl border-2 bg-white p-1'
/** A toggle keeps one name; aria-pressed tells whether the task is done. */
const toggleLabel = (t: Todo) => `ทำเครื่องหมายว่าเสร็จ: ${t.title}`
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div class="flex items-end justify-between gap-2 sm:block">
      <div>
        <p class="m-0 text-[0.8125rem] leading-normal font-semibold text-muted">{{ eyebrow }}</p>
        <h2 class="m-0 text-[1.25rem] leading-normal font-bold sm:mt-0.5 sm:text-[1.5rem]">{{ title }}</h2>
      </div>
      <!-- Empty days say so once, in the dashed box below (owner check 2026-11-28). -->
      <p v-if="countText" class="m-0 text-[0.8125rem] leading-normal font-semibold text-muted sm:mt-1">{{ countText }}</p>
    </div>

    <form class="flex flex-col gap-2" @submit.prevent="submit">
      <div class="flex gap-2">
        <label for="new-day-todo" class="sr-only">เพิ่มงานในวันที่เลือก</label>
        <input
          id="new-day-todo"
          ref="input"
          v-model="draft"
          maxlength="200"
          autocomplete="off"
          :placeholder="`เพิ่มงานวันที่ ${nice}`"
          class="field box-border h-12 min-w-0 flex-1 text-[1rem] shadow-brutal-sm sm:h-11 sm:rounded-[10px] sm:px-3 sm:text-[0.875rem] sm:shadow-none"
        />
        <button
          type="submit"
          class="btn-primary h-12 px-4 sm:h-11 sm:rounded-[10px] sm:px-3.5 sm:shadow-none"
          :disabled="isBlank(draft)"
        >
          เพิ่ม +
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <!-- Plain words, not a pill: the date comes from the day you picked and is not a button (U6). -->
        <span class="inline-flex min-h-11 items-center gap-1.5 text-[0.8125rem] font-semibold" :class="past && 'text-danger'" data-day-target>
          <Icon name="calendarGrid" :size="17" />
          ลงวันที่ {{ nice }}
        </span>
        <AnchoredPicker label="ความสำคัญ">
          <template #trigger="{ triggerProps }">
            <button
              type="button"
              class="box-border inline-flex h-11 items-center gap-2 rounded-xl border-2 bg-white px-3 text-[0.8125rem] font-semibold"
              v-bind="triggerProps"
              :aria-label="`ความสำคัญ: ${PRIORITY_LABEL[priority]}`"
            >
              <span
                aria-hidden="true"
                class="box-border size-3 rounded-[3px] border-2"
                :style="{ background: PRIORITY_HEX[priority] }"
              ></span>
              {{ PRIORITY_LABEL[priority] }}
              <Icon name="chevronDown" :size="14" :stroke="3" />
            </button>
          </template>
          <template #default="{ close }">
            <PriorityPicker v-model="priority" @pick="close()" />
          </template>
        </AnchoredPicker>
      </div>
      <p v-if="pastHint" data-past-hint class="m-0 text-[0.8125rem] leading-normal font-semibold text-danger">{{ pastHint }}</p>
    </form>

    <ul class="m-0 flex list-none flex-col gap-2.5 p-0 pr-1 pb-1">
      <li
        v-for="t in dayTasks"
        :key="t.id"
        :data-todo-id="t.id"
        class="box-border flex min-h-15.5 items-center gap-1.5 rounded-[14px] border-2 p-1.5 motion-safe:transition motion-safe:duration-100 sm:min-h-14.5 sm:gap-2 sm:rounded-xl"
        :class="
          t.is_completed
            ? 'bg-white'
            : [PRIORITY_BG[t.priority], 'shadow-brutal sm:shadow-brutal-sm motion-safe:hover:-translate-0.5']
        "
      >
        <button
          type="button"
          class="icon-btn"
          :aria-pressed="t.is_completed"
          :aria-label="toggleLabel(t)"
          :aria-busy="busy[t.id] || undefined"
          :disabled="locked[t.id]"
          @click="toggle(t.id)"
        >
          <Icon v-if="busy[t.id]" name="spinner" :size="22" :stroke="3" />
          <Icon v-else-if="t.is_completed" name="check" :size="22" :stroke="3.5" />
        </button>
        <button
          type="button"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-1.5 py-0.5 text-left disabled:cursor-not-allowed"
          :tabindex="isSm ? -1 : undefined"
          :data-open-todo="isSm ? undefined : t.id"
          :disabled="locked[t.id]"
          @click="openDetail(t.id)"
        >
          <!-- The button's name holds every word it shows, for voice control (UI 14, SEO 12). -->
          <span v-if="!isSm" class="sr-only">แก้ไข: </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class="text-[0.9375rem] leading-normal font-bold wrap-anywhere decoration-2 sm:text-[0.875rem]"
              :class="t.is_completed && 'line-through'"
            >
              {{ t.title }}
            </span>
            <span class="flex flex-wrap items-center gap-1.5">
              <span class="text-[0.75rem] font-semibold">{{ PRIORITY_LABEL[t.priority] }}</span>
              <span
                v-if="t.is_completed && doneLabel(t.completed_at)"
                data-done-chip
                class="inline-flex items-center gap-1 rounded-md border-2 bg-white px-2 py-px text-[0.75rem] font-semibold"
              >
                <Icon name="check" :size="12" :stroke="3.5" />
                {{ doneLabel(t.completed_at) }}
              </span>
              <span
                v-if="overdue(t)"
                class="inline-block rounded-md border-2 bg-danger px-2 py-px text-[0.75rem] font-semibold text-white"
              >
                เลยกำหนด
              </span>
            </span>
          </span>
          <Icon v-if="!isSm" name="chevronRight" :size="16" :stroke="3" />
        </button>
        <button
          v-if="isSm"
          type="button"
          class="icon-btn"
          :aria-label="`แก้ไข: ${t.title}`"
          :data-open-todo="t.id"
          :disabled="locked[t.id]"
          @click="openDetail(t.id)"
        >
          <Icon name="pencil" :size="18" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="`ลบ: ${t.title}`"
          :disabled="locked[t.id]"
          @click="remove(t.id, { keyboard: $event.detail === 0 })"
        >
          <Icon name="trash" :size="18" />
        </button>
      </li>
      <li
        v-if="dayTasks.length === 0"
        class="rounded-[14px] border-2 border-dashed px-3 py-5.5 text-center text-[0.875rem] leading-normal font-semibold sm:rounded-xl sm:py-5"
      >
        {{ emptyText }}
      </li>
    </ul>

    <!-- mobile: the next few tasks after the selected day, in a box of their own -->
    <section v-if="!isSm && upcoming.length > 0" :class="box" aria-labelledby="day-next-heading" data-day-next>
      <div>
        <h3 id="day-next-heading" class="m-0 text-[0.875rem] leading-normal font-bold">
          {{ allUpcoming.length > upcoming.length ? `${upcoming.length} งานแรก` : 'งาน' }}ถัดไปหลังวันที่ {{ nice }}
        </h3>
        <p class="m-0 text-[0.75rem] leading-normal font-semibold text-muted">
          ไม่ใช่งานของวันที่เลือก ดูวันส่งได้ทางขวา{{ allUpcoming.length > upcoming.length ? ` (มีทั้งหมด ${allUpcoming.length} งาน)` : '' }}
        </p>
      </div>
      <div v-for="u in upcoming" :key="u.id" :class="row" :data-todo-id="u.id">
        <button
          type="button"
          class="icon-btn"
          :aria-pressed="u.is_completed"
          :aria-label="toggleLabel(u)"
          :disabled="locked[u.id]"
          @click="toggle(u.id)"
        >
          <Icon v-if="busy[u.id]" name="spinner" :size="20" :stroke="3" />
        </button>
        <button
          type="button"
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent px-1 text-left"
          :data-open-todo="u.id"
          @click="openDetail(u.id)"
        >
          <span class="sr-only">แก้ไข: </span>
          <span class="box-border size-3 flex-none rounded-[3px] border-2" :class="PRIORITY_BG[u.priority]" aria-hidden="true"></span>
          <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{{ u.title }}</span>
          <!-- Already overdue (a past day is selected): red like everywhere else (round 6, L6). -->
          <span
            class="flex-none rounded-full border-2 px-2 text-[0.75rem] font-semibold"
            :class="isOverdue(u.due_date, false, today) ? 'border-danger bg-danger text-white' : 'bg-white'"
          >
            <span v-if="isOverdue(u.due_date, false, today)" class="sr-only">เลยกำหนด </span>{{ shortDate(u.due_date!) }}
          </span>
        </button>
      </div>
    </section>

    <!-- undated tasks: hidden when there are none -->
    <section v-if="undated.length > 0" :class="box" aria-labelledby="day-undated-heading" data-day-undated>
      <div>
        <h3 id="day-undated-heading" class="m-0 flex items-center gap-2 text-[0.875rem] leading-normal font-bold">
          งานที่ไม่มีกำหนดส่ง
          <span class="text-[0.75rem] font-semibold text-muted">{{ undated.length }} งาน</span>
        </h3>
        <p class="m-0 text-[0.75rem] leading-normal font-semibold text-muted">ไม่ได้อยู่ในวันไหน จึงแสดงไว้ทุกวัน</p>
      </div>
      <div v-for="u in undated" :key="u.id" :class="row" :data-todo-id="u.id">
        <button
          type="button"
          class="icon-btn"
          :aria-pressed="u.is_completed"
          :aria-label="toggleLabel(u)"
          :disabled="locked[u.id]"
          @click="toggle(u.id)"
        >
          <Icon v-if="busy[u.id]" name="spinner" :size="20" :stroke="3" />
        </button>
        <button
          type="button"
          class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent px-1 text-left"
          :data-open-todo="u.id"
          @click="openDetail(u.id)"
        >
          <span class="sr-only">แก้ไข: </span>
          <span class="box-border size-3 flex-none rounded-[3px] border-2" :class="PRIORITY_BG[u.priority]" aria-hidden="true"></span>
          <span class="min-w-0 flex-1 text-[0.8125rem] leading-normal font-semibold wrap-anywhere">{{ u.title }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
