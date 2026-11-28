<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRef, useId, watch } from 'vue'
import { ApiError } from '../api/todos'
import { useDetail } from '../composables/useDetail'
import { trapTab, useScrollLock } from '../composables/useFocus'
import { useHistoryModal } from '../composables/useHistoryModal'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { PRIORITY_BG, PRIORITY_LABEL, type Priority, type TodoPatch } from '../types'
import { addDays, isOverdue, stamp, today } from '../utils/date'
import { isBlank } from '../utils/text'
import DuePicker from './DuePicker.vue'
import Icon from './Icon.vue'
import PriorityPicker from './PriorityPicker.vue'

/*
 * Edit dialog (640px and up) and bottom sheet (below 640px).
 * Fields: ชื่องาน, สถานะ, กำหนดส่ง, ความสำคัญ, โน้ต.
 * Esc, the X, the ปิด button, the backdrop and the phone's Back button all close it,
 * asking first when there are unsaved changes.
 * สถานะ saves at once, like the tick on a card (QA round 4, U8), and says when the task was
 * completed (P16). An overdue task can be moved to today or tomorrow in one tap (owner decision 5).
 */
const NOTES_MAX = 2000
const { detailId, closeDetail } = useDetail()
const { todos, toast, saveDetail, remove, forget, showToast, dismissToast, toggle, reschedule } = useTodos()
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
  notesHint: `${uid}-notes-hint`,
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
/** A paste made the note longer than the limit and the end was cut off (R2-09). */
const notesCut = ref(false)

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
    notesCut.value = false
    statusNote.value = ''
    clearErrors()
    // An old error toast would only cover the dialog; the dialog shows its own errors (R2-07).
    if (toast.value?.kind === 'error') dismissToast()
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
const titleEmpty = computed(() => isBlank(draft.title))
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

/*
 * Changes made outside the form (สถานะ, the move buttons, their undo, a failed save rolling
 * back) flow into the draft, unless the person has edited that field here.
 */
watch(
  () => todo.value?.is_completed,
  (v) => {
    if (v === undefined) return
    draft.is_completed = v
    original.value = { ...original.value, is_completed: v }
  },
)
watch(
  () => todo.value?.due_date,
  (v) => {
    if (v === undefined || draft.due !== original.value.due) return
    draft.due = v ?? ''
    original.value = { ...original.value, due: v ?? '' }
  },
)

/** What สถานะ just did, read out inside the dialog (the page's live region is behind the modal). */
const statusNote = ref('')
function setStatus(done: boolean) {
  const t = todo.value
  if (!t || t.is_completed === done) return
  toggle(t.id, { quiet: true })
  if (t.is_completed === done) statusNote.value = done ? 'บันทึกแล้ว งานนี้เสร็จแล้ว' : 'บันทึกแล้ว งานนี้ยังไม่เสร็จ'
}

const overdueNow = computed(() => {
  const t = todo.value
  return !!t && draft.due === original.value.due && isOverdue(t.due_date, t.is_completed, today.value)
})
function move(days: 0 | 1) {
  const t = todo.value
  if (!t) return
  const msg = days === 0 ? `ย้าย “${t.title}” มาวันนี้แล้ว` : `ย้าย “${t.title}” ไปพรุ่งนี้แล้ว`
  if (reschedule(t.id, addDays(today.value, days), msg)) statusNote.value = msg
}

async function askDiscard() {
  showConfirm.value = true
  await nextTick()
  keepButton.value?.focus()
}

async function requestClose() {
  if (saving.value) return
  if (dirty.value) await askDiscard()
  else closeDetail()
}

// The phone's Back button closes the detail too, and asks first when there are unsaved changes (R2-01).
useHistoryModal({
  key: 'task',
  open: isOpen,
  value: () => String(detailId.value),
  onBack: () => closeDetail(),
  canLeave: () => {
    if (!isOpen.value) return true
    if (saving.value) return false
    if (!dirty.value) return true
    void askDiscard()
    return false
  },
})

// Refreshing or closing the tab with unsaved changes asks first (R2-19).
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isOpen.value && dirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

function onNotesPaste(e: ClipboardEvent) {
  const el = e.target as HTMLTextAreaElement
  const pasted = e.clipboardData?.getData('text') ?? ''
  notesCut.value = el.value.length - (el.selectionEnd - el.selectionStart) + pasted.length > NOTES_MAX
}
watch(
  () => draft.notes.length,
  (n) => {
    if (n < NOTES_MAX) notesCut.value = false
  },
)

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
    if (err instanceof ApiError && err.isNotFound) {
      // Deleted in another tab or on another device: saving again could never work (R2-08).
      closeDetail()
      forget(t.id)
      showToast('error', 'งานนี้ถูกลบไปแล้ว จากแท็บหรือเครื่องอื่น')
      return
    }
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

function deleteTodo(e: MouseEvent) {
  const t = todo.value
  if (!t) return
  closeDetail()
  remove(t.id, { keyboard: e.detail === 0 }) // detail 0: pressed with Enter or Space
}

const statusOptions = [
  { value: false, label: 'ยังไม่เสร็จ' },
  { value: true, label: 'เสร็จแล้ว' },
]
const titleError = computed(() => (titleEmpty.value ? 'ต้องมีชื่องานอย่างน้อย 1 ตัวอักษร' : (fieldErrors.title ?? '')))

// On short screens (landscape phone, 400% zoom) the dialog takes the whole height and the
// footer scrolls with the fields, so the fields get the room (R2-13).
const sectionClass = toRef(() =>
  isSm.value
    ? 'relative w-150 max-w-full max-h-[calc(100dvh-3rem)] rounded-[20px] shadow-brutal-xl short:max-h-dvh short:rounded-none'
    : 'absolute inset-x-0 bottom-0 top-24 rounded-t-3xl border-b-0 short:top-0 short:rounded-none',
)
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-40 bg-ink/55 sm:flex sm:items-center sm:justify-center sm:p-6 short:p-0"
    @keydown="onKeydown"
  >
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
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
        class="flex items-center justify-between gap-3 border-b-2 py-2.5 pr-3.5 pl-5 sm:py-3 sm:pl-5.5 short:py-1"
        :class="band"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <h2 :id="ids.heading" class="m-0 text-[0.9375rem] leading-normal font-bold sm:text-[1rem]">รายละเอียดงาน</h2>
          <!-- Importance always, and done as a badge of its own, so neither replaces the other (U7). -->
          <span class="rounded-full border-2 bg-white px-3 py-0.5 text-[0.8125rem] leading-normal font-semibold" data-detail-priority>
            {{ PRIORITY_LABEL[draft.priority] }}
          </span>
          <span
            v-if="draft.is_completed"
            class="inline-flex items-center gap-1 rounded-full border-2 bg-ink px-3 py-0.5 text-[0.8125rem] leading-normal font-semibold text-white"
            data-detail-done
          >
            <Icon name="check" :size="13" :stroke="3.5" />
            เสร็จแล้ว
          </span>
        </div>
        <button type="button" class="icon-btn" aria-label="ปิด" @click="requestClose">
          <Icon name="close" :size="18" :stroke="3" />
        </button>
      </div>

      <form class="flex min-h-0 flex-1 flex-col short:overflow-y-auto" novalidate @submit.prevent="save">
        <div
          class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4.5 sm:gap-4.5 sm:p-5.5 short:flex-none short:overflow-visible"
        >
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
              class="field box-border h-12.5 text-[1.0625rem] font-bold sm:text-[1.25rem]"
              :class="draft.is_completed && 'line-through'"
            />
            <div class="flex justify-between gap-2">
              <span v-if="titleError" role="alert" class="text-[0.75rem] leading-normal font-semibold text-danger">
                {{ titleError }}
              </span>
              <span :id="ids.titleCount" class="ml-auto text-[0.75rem] font-semibold text-muted">
                {{ draft.title.length }}/200
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3">
              <span :id="ids.status" class="label">สถานะ</span>
              <span class="text-[0.75rem] leading-normal font-semibold text-muted">สถานะบันทึกทันที ส่วนอื่นกด บันทึก</span>
            </div>
            <div role="group" :aria-labelledby="ids.status" class="grid grid-cols-2 gap-2">
              <button
                v-for="o in statusOptions"
                :key="o.label"
                type="button"
                class="opt rounded-xl text-[0.875rem]"
                :aria-pressed="draft.is_completed === o.value"
                @click="setStatus(o.value)"
              >
                <Icon v-if="draft.is_completed === o.value" name="check" :size="14" :stroke="3.5" />
                {{ o.label }}
              </button>
            </div>
            <span v-if="todo!.is_completed && todo!.completed_at" class="text-[0.8125rem] leading-normal font-semibold" data-completed-at>
              เสร็จเมื่อ {{ stamp(todo!.completed_at) }}
            </span>
            <span class="sr-only" role="status">{{ statusNote }}</span>
          </div>

          <div class="flex flex-col gap-2">
            <span :id="ids.due" class="label">กำหนดส่ง</span>
            <div role="group" :aria-labelledby="ids.due" class="flex">
              <DuePicker v-model="draft.due" :done="draft.is_completed" />
            </div>
            <div
              v-if="overdueNow"
              class="flex flex-wrap items-center gap-2 rounded-xl border-2 border-danger bg-[#ffe3e3] px-3 py-2 text-[#8f1d1d]"
              data-move-row
            >
              <span class="flex-[1_1_100%] text-[0.8125rem] leading-normal font-semibold sm:flex-1">เลยกำหนดแล้ว ย้ายวันส่งได้ทันที</span>
              <button type="button" class="btn-pill h-10 border-ink bg-white px-3 text-[0.8125rem] text-ink" @click="move(0)">ย้ายมาวันนี้</button>
              <button type="button" class="btn-pill h-10 border-ink bg-white px-3 text-[0.8125rem] text-ink" @click="move(1)">ย้ายไปพรุ่งนี้</button>
            </div>
            <span v-if="fieldErrors.due_date" role="alert" class="text-[0.75rem] leading-normal font-semibold text-danger">
              {{ fieldErrors.due_date }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span :id="ids.pri" class="label">ความสำคัญ</span>
            <div role="group" :aria-labelledby="ids.pri">
              <PriorityPicker v-model="draft.priority" :layout="isSm ? 'row' : 'grid'" />
            </div>
            <span v-if="fieldErrors.priority" role="alert" class="text-[0.75rem] leading-normal font-semibold text-danger">
              {{ fieldErrors.priority }}
            </span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3">
              <label :for="ids.notes" class="label">โน้ต</label>
              <span :id="ids.notesHint" class="text-[0.75rem] leading-normal font-semibold text-muted">
                ทุกคนที่เปิดลิงก์นี้เห็นโน้ตด้วย
              </span>
            </div>
            <textarea
              :id="ids.notes"
              :aria-describedby="ids.notesHint"
              v-model="draft.notes"
              rows="5"
              :maxlength="NOTES_MAX"
              :placeholder="isSm ? 'จดรายละเอียด ลิงก์ หรือขั้นตอนเพิ่มเติม...' : 'จดรายละเอียดเพิ่มเติม...'"
              class="box-border w-full rounded-xl border-2 bg-white px-3 py-2.5 text-[1rem] leading-normal font-medium max-sm:resize-none sm:resize-y sm:px-3.5 sm:py-3 sm:text-[0.9375rem]"
              @paste="onNotesPaste"
            ></textarea>
            <div v-if="notesCut || draft.notes.length >= NOTES_MAX - 200" class="flex justify-between gap-2">
              <span v-if="notesCut" role="alert" class="text-[0.75rem] leading-normal font-semibold text-danger">
                ข้อความยาวเกิน 2000 ตัวอักษร ส่วนท้ายถูกตัดออก
              </span>
              <span class="ml-auto text-[0.75rem] font-semibold text-muted">{{ draft.notes.length }}/{{ NOTES_MAX }}</span>
            </div>
            <span v-if="fieldErrors.notes" role="alert" class="text-[0.75rem] leading-normal font-semibold text-danger">
              {{ fieldErrors.notes }}
            </span>
          </div>

          <div class="flex flex-wrap gap-x-5 gap-y-1 text-[0.75rem] leading-normal font-semibold text-muted">
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
            <span class="flex-1 text-[0.875rem] leading-normal font-bold">ทิ้งการแก้ไขไหม?</span>
            <button
              type="button"
              class="box-border h-11 shrink-0 rounded-xl border-2 bg-danger px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-white"
              @click="closeDetail()"
            >
              ทิ้งการแก้ไข
            </button>
            <button
              ref="keepButton"
              type="button"
              class="box-border h-11 shrink-0 rounded-xl border-2 bg-white px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap"
              @click="keepEditing"
            >
              แก้ต่อ
            </button>
          </div>

          <div
            v-if="saveFailed"
            role="alert"
            class="rounded-xl border-2 border-danger bg-[#ffe3e3] px-3.5 py-2.5 text-[0.875rem] leading-normal font-semibold text-[#8f1d1d]"
          >
            บันทึกไม่สำเร็จ ข้อมูลที่แก้ยังอยู่ครบ ลองกดบันทึกอีกครั้ง
          </div>

          <div class="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              class="box-border inline-flex h-11 flex-none items-center gap-1.5 rounded-xl border-2 border-danger bg-white px-3 text-[0.875rem] font-semibold text-danger sm:gap-2 sm:px-3.5"
              @click="deleteTodo"
            >
              <Icon name="trash" :size="18" :stroke="2.5" />
              ลบงาน
            </button>
            <span class="flex-1 max-sm:hidden"></span>
            <button
              type="button"
              class="box-border h-11 flex-none rounded-xl border-2 bg-white px-4 text-[0.875rem] font-semibold"
              @click="requestClose"
            >
              ปิด
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
