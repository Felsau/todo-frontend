<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRef, useId, watch } from 'vue'
import { ApiError } from '../api/todos'
import { useDetail } from '../composables/useDetail'
import { trapTab, useScrollLock } from '../composables/useFocus'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_BG, PRIORITY_LABEL, type Priority, type TodoPatch } from '../types'
import { stamp } from '../utils/date'
import DuePicker from './DuePicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'

/*
 * Edit dialog (640px and up) and bottom sheet (below 640px).
 * Fields: ชื่องาน, สถานะ, กำหนดส่ง, ความสำคัญ, โน้ต.
 * Esc, the X, the ปิด/ยกเลิก button and the backdrop all call requestClose().
 */
const { detailId, closeDetail } = useDetail()
const { todos, saveDetail, remove, showToast } = useTodos()
const isSm = useIsSm()

const uid = useId()
const ids = {
  title: `${uid}-title`,
  titleCount: `${uid}-count`,
  heading: `${uid}-heading`,
  status: `${uid}-status`,
  due: `${uid}-due`,
  pri: `${uid}-pri`,
  notes: `${uid}-notes`,
}

const todo = computed(() => (detailId.value === null ? undefined : todos.value.find((t) => t.id === detailId.value)))
const isOpen = computed(() => !!todo.value)

interface Draft {
  title: string
  is_completed: boolean
  due: string
  priority: Priority
  notes: string
}
const draft = reactive<Draft>({ title: '', is_completed: false, due: '', priority: 'normal', notes: '' })
/** Values the dialog opened with, so unsaved changes can be detected. */
const original = ref<Draft>({ ...draft })

const section = ref<HTMLElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const keepButton = ref<HTMLButtonElement | null>(null)

const showConfirm = ref(false)
const saving = ref(false)
const saveFailed = ref(false)
const fieldErrors = reactive<Record<string, string>>({})

useScrollLock(isOpen)

function clearErrors() {
  saveFailed.value = false
  for (const k of Object.keys(fieldErrors)) delete fieldErrors[k]
}

// Load the draft each time the dialog opens for a todo.
watch(
  detailId,
  async (id) => {
    if (id === null) return
    const t = todos.value.find((x) => x.id === id)
    if (!t) return
    Object.assign(draft, {
      title: t.title,
      is_completed: t.is_completed,
      due: t.due_date ?? '',
      priority: t.priority,
      notes: t.notes ?? '',
    })
    original.value = { ...draft }
    showConfirm.value = false
    saving.value = false
    clearErrors()
    await nextTick()
    titleInput.value?.focus()
  },
  { immediate: true },
)

// The todo vanished underneath us (for example it was deleted): close quietly.
watch(todo, (t) => {
  if (detailId.value !== null && !t) closeDetail()
})

/** Only the fields that differ from what the dialog opened with. */
const changes = computed<TodoPatch>(() => {
  const o = original.value
  const patch: TodoPatch = {}
  if (draft.title.trim() !== o.title.trim()) patch.title = draft.title.trim()
  if (draft.is_completed !== o.is_completed) patch.is_completed = draft.is_completed
  if (draft.due !== o.due) patch.due_date = draft.due || null
  if (draft.priority !== o.priority) patch.priority = draft.priority
  if (draft.notes.trim() !== o.notes.trim()) patch.notes = draft.notes.trim() ? draft.notes : null
  return patch
})
const dirty = computed(() => Object.keys(changes.value).length > 0)
const titleEmpty = computed(() => draft.title.trim().length === 0)
const canSave = computed(() => dirty.value && !titleEmpty.value && !saving.value)

// Any edit cancels the discard question and clears old errors.
watch(
  () => ({ ...draft }),
  () => {
    showConfirm.value = false
    clearErrors()
  },
)

const band = computed(() => (draft.is_completed ? 'bg-white' : PRIORITY_BG[draft.priority]))
const priLabel = computed(() => (draft.is_completed ? 'เสร็จแล้ว' : PRIORITY_LABEL[draft.priority]))

async function requestClose() {
  if (saving.value) return
  if (dirty.value) {
    showConfirm.value = true
    await nextTick()
    keepButton.value?.focus()
  } else {
    closeDetail()
  }
}

function keepEditing() {
  showConfirm.value = false
  void nextTick(() => titleInput.value?.focus())
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    if (showConfirm.value) keepEditing()
    else void requestClose()
  } else {
    trapTab(e, section.value)
  }
}

const FIELD_MESSAGES: Record<string, string> = {
  title: 'ชื่องานต้องมี 1 ถึง 200 ตัวอักษร',
  notes: 'โน้ตยาวเกินไป ใส่ได้ไม่เกิน 2000 ตัวอักษร',
  due_date: 'วันที่ไม่ถูกต้อง ลองเลือกใหม่อีกครั้ง',
  priority: 'ความสำคัญไม่ถูกต้อง ลองเลือกใหม่อีกครั้ง',
}

async function save() {
  const t = todo.value
  if (!t || !canSave.value) return
  saving.value = true
  clearErrors()
  try {
    await saveDetail(t.id, changes.value)
    closeDetail()
    showToast('saved', 'บันทึกแล้ว')
  } catch (err) {
    if (err instanceof ApiError && err.isValidation && err.errors.length > 0) {
      for (const e of err.errors) {
        fieldErrors[e.field] =
          e.field === 'title' && e.rule === 'required' ? 'ต้องมีชื่องานอย่างน้อย 1 ตัวอักษร' : (FIELD_MESSAGES[e.field] ?? 'ข้อมูลไม่ถูกต้อง')
      }
      if (!Object.keys(fieldErrors).some((k) => k in FIELD_MESSAGES)) saveFailed.value = true
    } else {
      // The dialog stays open with every value the user typed.
      saveFailed.value = true
    }
  } finally {
    saving.value = false
  }
}

function deleteTodo() {
  const t = todo.value
  if (!t) return
  closeDetail()
  remove(t.id)
}

const statusOptions = [
  { value: false, label: 'ยังไม่เสร็จ' },
  { value: true, label: 'เสร็จแล้ว' },
]
const titleError = computed(() => (titleEmpty.value ? 'ต้องมีชื่องานอย่างน้อย 1 ตัวอักษร' : (fieldErrors.title ?? '')))

const sectionClass = toRef(() =>
  isSm.value
    ? 'relative w-150 max-w-full max-h-[calc(100dvh-3rem)] rounded-[20px] shadow-brutal-xl'
    : 'absolute inset-x-0 bottom-0 top-24 rounded-t-3xl border-b-0',
)
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-40 bg-ink/55 sm:flex sm:items-center sm:justify-center sm:p-6"
    @keydown="onKeydown"
  >
    <button
      type="button"
      tabindex="-1"
      aria-label="ปิด"
      class="absolute inset-0 size-full cursor-default border-0 bg-transparent p-0"
      @click="requestClose"
    />

    <section
      ref="section"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ids.heading"
      class="flex flex-col overflow-hidden border-2 bg-white"
      :class="sectionClass"
    >
      <div
        class="flex items-center justify-between gap-3 border-b-2 py-2.5 pr-3.5 pl-5 sm:py-3 sm:pl-5.5"
        :class="band"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <h2 :id="ids.heading" class="m-0 text-[15px] leading-normal font-bold sm:text-[16px]">รายละเอียดงาน</h2>
          <span class="rounded-full border-2 bg-white px-3 py-0.5 text-[13px] leading-normal font-semibold">
            {{ priLabel }}
          </span>
        </div>
        <button type="button" class="icon-btn" aria-label="ปิด" @click="requestClose">
          <Icon name="close" :size="18" :stroke="3" />
        </button>
      </div>

      <form class="flex min-h-0 flex-1 flex-col" novalidate @submit.prevent="save">
        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4.5 sm:gap-4.5 sm:p-5.5">
          <div class="flex flex-col gap-1">
            <label :for="ids.title" class="label">ชื่องาน</label>
            <input
              :id="ids.title"
              ref="titleInput"
              v-model="draft.title"
              maxlength="200"
              autocomplete="off"
              :aria-describedby="ids.titleCount"
              :aria-invalid="!!titleError"
              class="field box-border h-12.5 text-[17px] font-bold sm:text-[20px]"
              :class="draft.is_completed && 'line-through'"
            />
            <div class="flex justify-between gap-2">
              <span v-if="titleError" role="alert" class="text-[12px] leading-normal font-semibold text-danger">
                {{ titleError }}
              </span>
              <span :id="ids.titleCount" class="ml-auto text-[12px] font-semibold text-muted">
                {{ draft.title.length }}/200
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <span :id="ids.status" class="label">สถานะ</span>
            <div role="group" :aria-labelledby="ids.status" class="grid grid-cols-2 gap-2">
              <button
                v-for="o in statusOptions"
                :key="o.label"
                type="button"
                class="opt rounded-xl text-[14px]"
                :aria-pressed="draft.is_completed === o.value"
                @click="draft.is_completed = o.value"
              >
                <Icon v-if="draft.is_completed === o.value" name="check" :size="14" :stroke="3.5" />
                {{ o.label }}
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span :id="ids.due" class="label">กำหนดส่ง</span>
            <div role="group" :aria-labelledby="ids.due" class="flex">
              <DuePicker v-model="draft.due" variant="inline" />
            </div>
            <span v-if="fieldErrors.due_date" role="alert" class="text-[12px] leading-normal font-semibold text-danger">
              {{ fieldErrors.due_date }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span :id="ids.pri" class="label">ความสำคัญ</span>
            <div role="group" :aria-labelledby="ids.pri">
              <PriorityPicker v-model="draft.priority" :layout="isSm ? 'row' : 'grid'" />
            </div>
            <span v-if="fieldErrors.priority" role="alert" class="text-[12px] leading-normal font-semibold text-danger">
              {{ fieldErrors.priority }}
            </span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label :for="ids.notes" class="label">โน้ต</label>
            <textarea
              :id="ids.notes"
              v-model="draft.notes"
              rows="5"
              maxlength="2000"
              :placeholder="isSm ? 'จดรายละเอียด ลิงก์ หรือขั้นตอนเพิ่มเติม...' : 'จดรายละเอียดเพิ่มเติม...'"
              class="box-border w-full rounded-xl border-2 bg-white px-3 py-2.5 text-[14px] leading-normal font-medium max-sm:resize-none sm:resize-y sm:px-3.5 sm:py-3 sm:text-[15px]"
            ></textarea>
            <span v-if="fieldErrors.notes" role="alert" class="text-[12px] leading-normal font-semibold text-danger">
              {{ fieldErrors.notes }}
            </span>
          </div>

          <div class="flex flex-wrap gap-x-5 gap-y-1 text-[12px] leading-normal font-semibold text-muted">
            <span>สร้างเมื่อ {{ stamp(todo!.created_at) }}</span>
            <span>แก้ไขล่าสุด {{ stamp(todo!.updated_at) }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2 border-t-2 bg-white px-5 pt-3 pb-6 sm:px-5.5 sm:pt-4 sm:pb-5">
          <div
            v-if="showConfirm"
            role="alertdialog"
            aria-label="ยืนยันการปิด"
            class="flex flex-wrap items-center gap-2 rounded-xl border-2 bg-normal px-2.5 py-2"
          >
            <span class="flex-1 text-[14px] leading-normal font-bold">ทิ้งการแก้ไขไหม?</span>
            <button
              type="button"
              class="box-border h-11 shrink-0 rounded-xl border-2 bg-danger px-3.5 text-[13px] font-semibold whitespace-nowrap text-white"
              @click="closeDetail()"
            >
              ทิ้งการแก้ไข
            </button>
            <button
              ref="keepButton"
              type="button"
              class="box-border h-11 shrink-0 rounded-xl border-2 bg-white px-3.5 text-[13px] font-semibold whitespace-nowrap"
              @click="keepEditing"
            >
              แก้ต่อ
            </button>
          </div>

          <div
            v-if="saveFailed"
            role="alert"
            class="rounded-xl border-2 border-danger bg-[#ffe3e3] px-3.5 py-2.5 text-[14px] leading-normal font-semibold text-[#8f1d1d]"
          >
            บันทึกไม่สำเร็จ ข้อมูลที่แก้ยังอยู่ครบ ลองกดบันทึกอีกครั้ง
          </div>

          <div class="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              class="box-border inline-flex h-11 flex-none items-center gap-1.5 rounded-xl border-2 border-danger bg-white px-3 text-[14px] font-semibold text-danger sm:gap-2 sm:px-3.5"
              @click="deleteTodo"
            >
              <Icon name="trash" :size="18" :stroke="2.5" />
              ลบงาน
            </button>
            <span class="flex-1 max-sm:hidden"></span>
            <button
              type="button"
              class="box-border h-11 flex-none rounded-xl border-2 bg-white px-4 text-[14px] font-semibold"
              @click="requestClose"
            >
              {{ dirty ? 'ยกเลิก' : 'ปิด' }}
            </button>
            <button type="submit" class="btn-primary max-sm:flex-1 sm:px-5.5" :disabled="!canSave" :aria-busy="saving || undefined">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </form>
    </section>
  </div>
</template>
