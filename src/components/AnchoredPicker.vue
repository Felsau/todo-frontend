<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import { focusables, trapTab, useScrollLock } from '../composables/useFocus'
import { useIsSm } from '../composables/useMedia'

/*
 * One shared picker for the whole app (design review R5).
 * - 640px and up: a popover under the trigger.
 * - Below 640px: a bottom sheet with a backdrop (role=dialog, aria-modal, focus trap).
 * On open it focuses the selected option (or the first control). Esc closes it,
 * clicking outside closes it, and focus goes back to the trigger on close.
 */
const props = defineProps<{ label: string; panelClass?: string }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const isSm = useIsSm()

useScrollLock(toRef(() => open.value && !isSm.value))

function trigger(): HTMLElement | null {
  return root.value?.querySelector<HTMLElement>('[data-picker-trigger]') ?? null
}

async function openPanel() {
  open.value = true
  await nextTick()
  const el = panel.value
  const target = el?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? focusables(el)[0]
  target?.focus()
}

function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) void nextTick(() => trigger()?.focus())
}

function toggle() {
  if (open.value) close()
  else void openPanel()
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
  } else if (!isSm.value) {
    trapTab(e, panel.value)
  }
}

/** Clicking outside the popover closes it (the sheet uses its backdrop instead). */
function onDocPointerDown(e: PointerEvent) {
  if (!open.value || !isSm.value) return
  if (root.value && !root.value.contains(e.target as Node)) close(false)
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))

const triggerProps = () => ({
  'data-picker-trigger': '',
  'aria-haspopup': 'dialog' as const,
  'aria-expanded': open.value,
  onClick: toggle,
})
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown">
    <slot name="trigger" :open="open" :trigger-props="triggerProps()" />

    <!-- popover: 640px and up -->
    <div
      v-if="open && isSm"
      ref="panel"
      role="dialog"
      :aria-label="props.label"
      class="absolute top-13 left-0 z-20 box-border rounded-[14px] border-2 bg-white p-3 shadow-brutal"
      :class="props.panelClass"
    >
      <slot :close="close" />
    </div>

    <!-- bottom sheet: below 640px -->
    <Teleport to="body">
      <div v-if="open && !isSm" class="fixed inset-0 z-40" @keydown="onKeydown">
        <button
          type="button"
          tabindex="-1"
          aria-label="ปิด"
          class="absolute inset-0 size-full cursor-default border-0 bg-ink/45 p-0"
          @click="close()"
        />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="props.label"
          class="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 rounded-t-[20px] border-2 border-b-0 bg-white px-5 pt-5 pb-7"
        >
          <h2 class="m-0 text-[20px] leading-normal font-bold">{{ props.label }}</h2>
          <slot :close="close" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
