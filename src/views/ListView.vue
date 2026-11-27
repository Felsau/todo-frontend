<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import AddBar from '../components/AddBar.vue'
import EmptyIllustration from '../components/EmptyIllustration.vue'
import FilterBar from '../components/FilterBar.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import LoadError from '../components/LoadError.vue'
import SearchSort from '../components/SearchSort.vue'
import TodoCard from '../components/TodoCard.vue'
import { useListUi } from '../composables/useListUi'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'

const { status, total, doneCount, clearCompleted } = useTodos()
const { visible, emptyText, searchOpen } = useListUi()
const isSm = useIsSm()

// Inline confirm for "clear completed". Any change to the done count cancels it.
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
  <ListSkeleton v-if="status === 'loading'" />
  <LoadError v-else-if="status === 'error'" />

  <template v-else>
    <SearchSort v-if="!isSm && searchOpen" compact />
    <AddBar />

    <div v-if="total > 0" class="flex flex-wrap items-center justify-between gap-3">
      <FilterBar class="max-sm:w-full" />
      <SearchSort v-if="isSm" />
    </div>

    <ul
      class="m-0 grid list-none gap-3 p-0 pr-1 pb-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:gap-4.5 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
    >
      <TodoCard v-for="t in visible" :key="t.id" :todo="t" />

      <li v-if="total === 0" class="col-span-full flex flex-col items-center gap-4.5 px-4 py-6 text-center sm:py-10">
        <EmptyIllustration :scale="isSm ? 1 : 0.8" />
        <div>
          <div class="text-[18px] leading-normal font-bold sm:text-[20px]">ยังไม่มีงานเลย</div>
          <div class="text-[14px] leading-normal font-medium text-muted sm:text-[15px]">
            พิมพ์งานแรกด้านบน แล้วกด “เพิ่ม +”
          </div>
        </div>
      </li>
      <li
        v-else-if="visible.length === 0"
        class="col-span-full rounded-2xl border-2 border-dashed px-4 py-7 text-center text-[15px] leading-normal font-bold sm:py-10 sm:text-[16px]"
      >
        {{ emptyText }}
      </li>
    </ul>

    <div v-if="total > 0 && (isSm || doneCount > 0)" class="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
      <div
        v-if="confirming"
        role="group"
        :aria-labelledby="confirmId"
        class="flex flex-wrap items-center justify-center gap-2"
        @keydown.esc.prevent="cancelClear"
      >
        <span :id="confirmId" class="w-full text-center text-[13px] font-semibold sm:w-auto sm:text-[14px]">
          ลบงานที่เสร็จแล้ว {{ doneCount }} งาน?
        </span>
        <button type="button" class="btn-pill border-ink bg-danger text-white" @click="doClear">ลบเลย</button>
        <button ref="cancelBtn" type="button" class="btn-pill" @click="cancelClear">ยกเลิก</button>
      </div>
      <button v-else ref="clearBtn" type="button" class="btn-pill" :disabled="doneCount === 0" @click="openClear">
        ลบงานที่เสร็จแล้ว
      </button>
    </div>
  </template>
</template>
