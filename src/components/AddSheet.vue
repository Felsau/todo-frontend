<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useAddForm } from '../composables/useAddForm'
import { trapTab, useScrollLock } from '../composables/useFocus'
import { useHistoryModal } from '../composables/useHistoryModal'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { isBlank } from '../utils/text'
import AddBar from './AddBar.vue'
import Icon from './Icon.vue'

/*
 * Phone add sheet (below 640px), opened from the round + button of the list view.
 * It opens with the cursor in the title box, so the keyboard comes up at once. After an add it
 * stays open with a short confirmation and an empty box, ready for the next task; the X, Esc,
 * the backdrop and the phone's Back button close it (asking first when text is still typed).
 * On closing, the usual "เพิ่ม ... แล้ว" toast with "ดูงาน" tells where the new task went, and
 * focus goes back to the + button. The sheet sits on top of the on screen keyboard.
 */
const { draft, sheetOpen, lastAdded, addedCount, reset, reveal, dropProxy } = useAddForm()
const { announceAdded } = useTodos()
const isSm = useIsSm()

const open = computed(() => sheetOpen.value && !isSm.value)
const form = ref<InstanceType<typeof AddBar> | null>(null)
const panel = ref<HTMLElement | null>(null)
const keepBtn = ref<HTMLButtonElement | null>(null)
const showConfirm = ref(false)
const addedText = computed(() => {
  const t = lastAdded.value
  if (!t) return ''
  return addedCount.value > 1 ? `เพิ่ม “${t.title}” แล้ว รวม ${addedCount.value} งาน` : `เพิ่ม “${t.title}” แล้ว`
})

useScrollLock(open)

/* ---------- on screen keyboard: keep the sheet on top of it (iOS Safari, Android Chrome) ---------- */
const kb = ref(0)
const viewH = ref(window.innerHeight)
function measure() {
  const vv = window.visualViewport
  if (!vv) return
  kb.value = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
  viewH.value = Math.round(vv.height)
}
function listen(on: boolean) {
  const vv = window.visualViewport
  if (!vv) return
  const fn = on ? vv.addEventListener.bind(vv) : vv.removeEventListener.bind(vv)
  fn('resize', measure)
  fn('scroll', measure)
}
const panelStyle = computed(() => ({
  bottom: `${kb.value}px`,
  maxHeight: `calc(${viewH.value}px - 0.75rem)`,
}))

watch(
  open,
  async (now) => {
    listen(now)
    if (!now) return
    measure()
    showConfirm.value = false
    await nextTick()
    form.value?.focus()
    dropProxy()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  listen(false)
  dropProxy()
})

// Growing to 640px with the sheet open: the inline row takes over with the same text.
watch(isSm, (sm) => {
  if (sm && sheetOpen.value) sheetOpen.value = false
})

/* ---------- closing ---------- */
function close() {
  if (!sheetOpen.value) return
  sheetOpen.value = false
  showConfirm.value = false
  const last = lastAdded.value
  const n = addedCount.value
  lastAdded.value = null
  addedCount.value = 0
  void nextTick(() => {
    document.querySelector<HTMLElement>('[data-add-fab]')?.focus({ preventScroll: true })
    if (last) announceAdded(last.tempId, last.title, reveal, n > 1 ? `เพิ่มแล้ว ${n} งาน` : undefined)
  })
}

async function askDiscard() {
  showConfirm.value = true
  await nextTick()
  keepBtn.value?.focus()
}

function requestClose() {
  if (isBlank(draft.value)) close()
  else void askDiscard()
}

function discard() {
  reset()
  close()
}

function keepTyping() {
  showConfirm.value = false
  void nextTick(() => form.value?.focus())
}

// The phone's Back button closes the sheet, asking first when text is still typed (R2-01).
useHistoryModal({
  key: 'add',
  open,
  onBack: () => close(),
  canLeave: () => {
    if (!open.value || isBlank(draft.value)) return true
    void askDiscard()
    return false
  },
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    if (showConfirm.value) keepTyping()
    else requestClose()
  } else {
    trapTab(e, panel.value)
  }
}

// Typing again cancels the discard question.
watch(draft, () => {
  showConfirm.value = false
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40" data-add-sheet @keydown="onKeydown">
      <button
        type="button"
        tabindex="-1"
        aria-hidden="true"
        class="absolute inset-0 size-full cursor-default border-0 bg-ink/45 p-0"
        @click="requestClose"
      />
      <section
        ref="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-sheet-title"
        class="absolute inset-x-0 flex flex-col gap-3 overflow-y-auto rounded-t-[20px] border-2 border-b-0 bg-white px-5 pt-3.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] motion-safe:animate-sheet-up"
        :style="panelStyle"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 id="add-sheet-title" class="m-0 text-[1.25rem] leading-normal font-bold">เพิ่มงานใหม่</h2>
          <button type="button" class="icon-btn" aria-label="ปิด" @click="requestClose">
            <Icon name="close" :size="18" :stroke="3" />
          </button>
        </div>

        <div v-if="lastAdded" data-add-confirm class="flex items-start gap-2.5 rounded-xl border-2 bg-sel px-3 py-2">
          <Icon name="check" :size="18" :stroke="3.5" class="mt-0.5 flex-none" />
          <p class="m-0 min-w-0 text-[0.875rem] leading-normal font-semibold wrap-anywhere">
            <span class="font-bold">{{ addedText }}</span>
            <span class="block text-muted">พิมพ์งานถัดไปได้เลย หรือกดปิดเมื่อเสร็จ</span>
          </p>
        </div>
        <!-- Screen readers do not hear the page's own live region behind a modal, so the sheet has one. -->
        <div class="sr-only" role="status" aria-live="polite">{{ lastAdded ? addedText : '' }}</div>

        <AddBar ref="form" sheet />

        <div
          v-if="showConfirm"
          role="alertdialog"
          aria-label="ยืนยันการปิด"
          class="flex flex-wrap items-center gap-2 rounded-xl border-2 bg-normal px-2.5 py-2"
        >
          <span class="flex-1 text-[0.875rem] leading-normal font-bold">ทิ้งข้อความที่พิมพ์ไว้ไหม?</span>
          <button
            type="button"
            class="box-border h-11 shrink-0 rounded-xl border-2 bg-danger px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-white"
            @click="discard"
          >
            ทิ้งข้อความ
          </button>
          <button
            ref="keepBtn"
            type="button"
            class="box-border h-11 shrink-0 rounded-xl border-2 bg-white px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap"
            @click="keepTyping"
          >
            พิมพ์ต่อ
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
