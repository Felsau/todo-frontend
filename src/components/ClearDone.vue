<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useTodos } from '../composables/useTodos'
import Icon from './Icon.vue'

/*
 * "ลบงานที่เสร็จแล้ว" with its inline confirm. It sits next to the เสร็จแล้ว heading, so it reads
 * as an action on that group and not as a fifth filter (QA round 4, U16). The heading already
 * shows the count; the question says how many go.
 */
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
  <div v-if="doneCount > 0" class="flex flex-wrap items-center gap-2" data-clear-done>
    <div
      v-if="confirming"
      role="group"
      :aria-labelledby="confirmId"
      class="flex flex-wrap items-center gap-2"
      @keydown.esc.prevent="cancelClear"
    >
      <span :id="confirmId" class="text-[0.8125rem] font-semibold sm:text-[0.875rem]">ลบงานที่เสร็จแล้ว {{ doneCount }} งาน?</span>
      <button type="button" class="btn-pill border-ink bg-danger px-3 text-white" @click="doClear">ลบเลย</button>
      <button ref="cancelBtn" type="button" class="btn-pill px-3" @click="cancelClear">ยกเลิก</button>
    </div>
    <button v-else ref="clearBtn" type="button" class="btn-pill gap-1.5 pr-3 pl-2.5 text-[0.8125rem]" @click="openClear">
      <Icon name="trash" :size="15" :stroke="2.5" />
      ลบงานที่เสร็จแล้ว
    </button>
  </div>
</template>
