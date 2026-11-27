<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalendarTodos } from '../composables/useCalendarTodos'
import { useDetail } from '../composables/useDetail'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_BG, PRIORITY_HEX, PRIORITY_LABEL, type Priority, type Todo } from '../types'
import { dayMonthLong, diffDays, isOverdue, shortDate, today, weekdayName } from '../utils/date'
import AnchoredPicker from './AnchoredPicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'

/*
 * The selected day: its add form and its tasks (side panel on desktop, agenda on mobile).
 * Desktop also lists undated todos; mobile adds the "ถัดไป" list and the undated section.
 */
const props = defineProps<{ selected: string }>()

const { todos, add, toggle, remove, busy, locked } = useTodos()
const { on, undated } = useCalendarTodos()
const { openDetail } = useDetail()
const isSm = useIsSm()

const dayTasks = computed(() => on(props.selected))
const nice = computed(() => shortDate(props.selected))
const offset = computed(() => diffDays(today.value, props.selected))

const eyebrow = computed(() => {
  const d = offset.value
  if (d === 0) return 'วันนี้'
  if (d === 1) return 'พรุ่งนี้'
  if (d === -1) return 'เมื่อวาน'
  return d > 0 ? `อีก ${d} วัน` : `${-d} วันก่อน`
})
const title = computed(() =>
  isSm.value
    ? `วัน${weekdayName(props.selected)}ที่ ${dayMonthLong(props.selected)}`
    : `${weekdayName(props.selected)} ${nice.value}`,
)
const countText = computed(() => {
  const list = dayTasks.value
  return list.length ? `เสร็จ ${list.filter((t) => t.is_completed).length} จาก ${list.length} งาน` : 'ยังไม่มีงาน'
})
const emptyText = computed(() =>
  offset.value === 0 ? 'วันนี้ว่าง เพิ่มงานด้านบนได้เลย' : `วันที่ ${nice.value} ว่าง เพิ่มงานด้านบนได้เลย`,
)

const upcoming = computed(() =>
  todos.value
    .filter((t) => !t.is_completed && t.due_date && t.due_date > props.selected)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : 0))
    .slice(0, 3),
)

/* add form: the new todo gets the selected day as its due date */
const draft = ref('')
const priority = ref<Priority>('normal')
const input = ref<HTMLInputElement | null>(null)

function submit() {
  const t = draft.value.trim()
  if (!t) return
  add({ title: t, priority: priority.value, due_date: props.selected })
  draft.value = ''
  priority.value = 'normal' // reset after every add, like the list view
  input.value?.focus()
}

const overdue = (t: Todo) => isOverdue(t.due_date, t.is_completed, today.value)
const toggleLabel = (t: Todo) => `${t.is_completed ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายว่าเสร็จ'}: ${t.title}`
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div class="flex items-end justify-between gap-2 sm:block">
      <div>
        <p class="m-0 text-[13px] leading-normal font-semibold text-muted">{{ eyebrow }}</p>
        <h2 class="m-0 text-[20px] leading-normal font-bold sm:mt-0.5 sm:text-[24px]">{{ title }}</h2>
      </div>
      <p class="m-0 text-[13px] leading-normal font-semibold text-muted sm:mt-1">{{ countText }}</p>
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
          class="field box-border h-12 min-w-0 flex-1 text-[15px] shadow-brutal-sm sm:h-11 sm:rounded-[10px] sm:px-3 sm:text-[14px] sm:shadow-none"
        />
        <button
          type="submit"
          class="btn-primary h-12 px-4 sm:h-11 sm:rounded-[10px] sm:px-3.5 sm:shadow-none"
          :disabled="!draft.trim()"
        >
          เพิ่ม +
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="box-border inline-flex h-11 items-center gap-2 rounded-xl border-2 bg-white px-3 text-[13px] font-semibold"
        >
          <Icon name="calendarGrid" :size="18" />
          วันที่ {{ nice }}
        </span>
        <AnchoredPicker label="ความสำคัญ">
          <template #trigger="{ triggerProps }">
            <button
              type="button"
              class="box-border inline-flex h-11 items-center gap-2 rounded-xl border-2 bg-white px-3 text-[13px] font-semibold"
              v-bind="triggerProps"
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
    </form>

    <ul class="m-0 flex list-none flex-col gap-2.5 p-0 pr-1 pb-1">
      <li
        v-for="t in dayTasks"
        :key="t.id"
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
          :aria-label="isSm ? undefined : `แก้ไข: ${t.title}`"
          :data-open-todo="isSm ? undefined : t.id"
          :disabled="locked[t.id]"
          @click="openDetail(t.id)"
        >
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class="text-[15px] leading-normal font-bold wrap-anywhere decoration-2 sm:text-[14px]"
              :class="t.is_completed && 'line-through'"
            >
              {{ t.title }}
            </span>
            <span class="flex flex-wrap items-center gap-1.5">
              <span class="text-[12px] font-semibold">{{ PRIORITY_LABEL[t.priority] }}</span>
              <span
                v-if="overdue(t)"
                class="inline-block rounded-md border-2 bg-danger px-2 py-px text-[12px] font-semibold text-white"
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
          @click="remove(t.id)"
        >
          <Icon name="trash" :size="18" />
        </button>
      </li>
      <li
        v-if="dayTasks.length === 0"
        class="rounded-[14px] border-2 border-dashed px-3 py-5.5 text-center text-[14px] leading-normal font-semibold sm:rounded-xl sm:py-5"
      >
        {{ emptyText }}
      </li>
    </ul>

    <!-- mobile: the next few tasks after the selected day -->
    <section v-if="!isSm && upcoming.length > 0" class="flex flex-col gap-2">
      <h3 class="m-0 text-[13px] leading-normal font-semibold">ถัดไป</h3>
      <button
        v-for="u in upcoming"
        :key="u.id"
        type="button"
        class="box-border flex min-h-11.5 w-full items-center gap-2.5 rounded-xl border-2 bg-white px-2.5 text-left"
        :aria-label="`แก้ไข: ${u.title}`"
        :data-open-todo="u.id"
        @click="openDetail(u.id)"
      >
        <span class="box-border size-3 flex-none rounded-[3px] border-2" :class="PRIORITY_BG[u.priority]"></span>
        <span class="min-w-0 flex-1 truncate text-[13px] font-semibold">{{ u.title }}</span>
        <span class="flex-none text-[12px] font-semibold">{{ shortDate(u.due_date!) }}</span>
      </button>
    </section>

    <!-- undated tasks: hidden when there are none -->
    <section v-if="undated.length > 0" class="flex flex-col gap-2 sm:border-t-2 sm:pt-3">
      <div class="flex items-center gap-2">
        <h3 class="m-0 text-[13px] leading-normal font-semibold">ไม่มีกำหนดส่ง</h3>
        <span
          class="box-border flex h-6 min-w-6 items-center justify-center rounded-full border-2 bg-white px-1.5 text-[12px] font-semibold max-sm:hidden"
        >
          {{ undated.length }}
        </span>
      </div>
      <button
        v-for="u in undated"
        :key="u.id"
        type="button"
        class="box-border flex min-h-11.5 w-full items-center gap-2.5 rounded-xl border-2 px-2.5 text-left text-[13px] leading-normal font-semibold max-sm:bg-white sm:min-h-11"
        :class="isSm && PRIORITY_BG[u.priority]"
        :aria-label="`แก้ไข: ${u.title}`"
        :data-open-todo="u.id"
        @click="openDetail(u.id)"
      >
        <span
          class="box-border size-3 flex-none rounded-[3px] border-2 sm:hidden"
          :class="PRIORITY_BG[u.priority]"
        ></span>
        <span class="min-w-0 flex-1 truncate sm:whitespace-normal">{{ u.title }}</span>
      </button>
    </section>
  </div>
</template>
