<script setup lang="ts">
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

/* One toast slot, bottom centre. The newest toast replaces the old one. */
const { toast, dismissToast } = useTodos()

function act() {
  const fn = toast.value?.onAction
  dismissToast()
  fn?.()
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-5 bottom-5 z-60 flex justify-center sm:inset-x-6 sm:bottom-7">
    <div
      v-if="toast"
      :key="toast.id"
      :role="toast.kind === 'error' ? 'alert' : 'status'"
      class="pointer-events-auto box-border flex max-w-full min-w-0 items-center gap-3 rounded-[14px] border-2 py-1.5 pr-1.5 pl-4 text-[14px] leading-normal font-semibold text-white max-sm:w-full sm:gap-4 sm:pl-4.5"
      :class="toast.kind === 'error' ? 'bg-danger shadow-brutal-sm' : 'bg-ink shadow-brutal-accent'"
    >
      <Icon v-if="toast.kind === 'saved'" name="check" :size="16" :stroke="3" />
      <span class="min-w-0 flex-1 wrap-anywhere" :class="toast.kind === 'saved' && 'pr-3'">{{ toast.message }}</span>
      <button
        v-if="toast.kind === 'undo'"
        type="button"
        class="h-11 flex-none rounded-[10px] border-2 border-white bg-accent px-3.5 text-[14px] font-semibold text-ink"
        @click="act"
      >
        {{ toast.actionLabel }}
      </button>
      <button
        v-else-if="toast.kind === 'error'"
        type="button"
        class="h-11 flex-none rounded-[10px] border-2 border-white bg-transparent px-3.5 text-[14px] font-semibold text-white"
        aria-label="ปิดข้อความแจ้งเตือน"
        @click="dismissToast"
      >
        ปิด
      </button>
    </div>
  </div>
</template>
