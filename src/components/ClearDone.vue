<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

/*
 * "ลบงานที่เสร็จแล้ว" with its inline confirm. Shown only when there is something to clear, on
 * every screen size (QA round 3, UI 3). From 640px it sits in the filter row right after
 * "เสร็จแล้ว" and carries the same count; on phones it stays under the list.
 */
defineProps<{ inline?: boolean }>()
const { doneCount, clearCompleted } = useTodos()

// Any change to the done count cancels the question.
const confirmClear = ref(false)
const confirming = computed(() => confirmClear.value && doneCount.value > 0)
watch(doneCount, () => {
  confirmClear.value = false
})

const confirmId = useId()
const clearBtn = ref<HTMLButtonElement | null>(null)
const cancelBtn = ref<HTMLButtonElement | null>(null)

async function openClear() {
  confirmClear.value = true
  await nextTick()
  cancelBtn.value?.focus()
}

async function cancelClear() {
  confirmClear.value = false
  await nextTick()
  clearBtn.value?.focus()
}

function doClear(e: MouseEvent) {
  confirmClear.value = false
  void clearCompleted({ keyboard: e.detail === 0 }) // detail 0: pressed with Enter or Space
}
</script>

<template>
  <div
    v-if="doneCount > 0"
    class="flex flex-wrap items-center gap-3"
    :class="inline ? 'justify-start' : 'justify-center'"
    data-clear-done
  >
    <div
      v-if="confirming"
      role="group"
      :aria-labelledby="confirmId"
      class="flex flex-wrap items-center gap-2"
      :class="inline ? 'justify-start' : 'justify-center'"
      @keydown.esc.prevent="cancelClear"
    >
      <span :id="confirmId" class="text-[0.8125rem] font-semibold sm:text-[0.875rem]" :class="!inline && 'w-full text-center'">
        ลบงานที่เสร็จแล้ว {{ doneCount }} งาน?
      </span>
      <button type="button" class="btn-pill border-ink bg-danger text-white" @click="doClear">ลบเลย</button>
      <button ref="cancelBtn" type="button" class="btn-pill" @click="cancelClear">ยกเลิก</button>
    </div>
    <button v-else ref="clearBtn" type="button" class="btn-pill gap-2 pr-2 pl-3.5" @click="openClear">
      <Icon name="trash" :size="16" :stroke="2.5" />
      ลบงานที่เสร็จแล้ว
      <span class="box-border flex h-6 min-w-6 items-center justify-center rounded-full bg-paper px-1.5 text-[0.75rem] font-semibold">
        {{ doneCount }}
      </span>
    </button>
  </div>
</template>
