<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import AddBar from '../components/AddBar.vue'
import AddSheet from '../components/AddSheet.vue'
import ClearDone from '../components/ClearDone.vue'
import EmptyIllustration from '../components/EmptyIllustration.vue'
import FilterBar from '../components/FilterBar.vue'
import Icon from '../components/Icon.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import LoadError from '../components/LoadError.vue'
import SearchSort from '../components/SearchSort.vue'
import TodoCard from '../components/TodoCard.vue'
import { useAddForm } from '../composables/useAddForm'
import { useListUi } from '../composables/useListUi'
import { useIsLg, useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'
import { estimateCard, splitColumns } from '../utils/columns'
import { isOverdue, today } from '../utils/date'

const { status, total } = useTodos()
const { groups, emptyText, noteHit } = useListUi()
const isSm = useIsSm()
const isLg = useIsLg()
const { sheetOpen, fabShown, openSheet, due, priority } = useAddForm()

/* Phones add through the round + button and its sheet; 640px and up keep the inline add row. */
watchEffect(() => {
  fabShown.value = !isSm.value && status.value === 'ready'
})
onBeforeUnmount(() => {
  fabShown.value = false
  // The add row starts fresh next time (QA round 4, P8); a half typed title is kept.
  due.value = ''
  priority.value = 'normal'
})

/*
 * Phones: one column of rows. From 640px the groups are placed whole into two columns (three from
 * 1024px), balanced by height, in order from the top of one column to the next, so the width is
 * used and the list still reads top to bottom (QA round 4, P21; recheck, N7). A group is never
 * cut in two. Every sort has headings, so the page keeps this shape (P13).
 */
const columns = computed(() => {
  const n = !isSm.value ? 1 : isLg.value ? 3 : 2
  return splitColumns(groups.value, n, (t) => {
    let extra = 0
    if (isOverdue(t.due_date, t.is_completed, today.value)) extra += 42
    if (noteHit(t)) extra += 22
    return estimateCard(t, extra)
  })
})
const grid =
  'm-0 grid list-none gap-3 p-0 pr-1 pb-1 sm:grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] sm:gap-4.5 lg:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]'
</script>

<template>
  <ListSkeleton v-if="status === 'loading'" />
  <LoadError v-else-if="status === 'error'" />

  <template v-else>
    <AddBar v-if="isSm" />

    <div v-if="total > 0" class="flex flex-wrap items-center justify-between gap-3">
      <FilterBar class="max-sm:w-full" />
      <SearchSort v-if="isSm" />
      <SearchSort v-else phone class="w-full" />
    </div>

    <ul v-if="total === 0" :class="grid">
      <li class="col-span-full flex flex-col items-center gap-4.5 px-4 py-6 text-center sm:py-10">
        <EmptyIllustration :scale="isSm ? 1 : 0.8" />
        <div>
          <div class="text-[1.125rem] leading-normal font-bold sm:text-[1.25rem]">ยังไม่มีงานเลย</div>
          <div class="text-[0.875rem] leading-normal font-medium text-muted sm:text-[0.9375rem]">
            {{ isSm ? 'พิมพ์งานแรกด้านบน แล้วกด “เพิ่ม +”' : 'กดปุ่ม + มุมขวาล่าง เพื่อเพิ่มงานแรก' }}
          </div>
        </div>
      </li>
    </ul>
    <ul v-else-if="groups.length === 0" :class="grid">
      <li
        class="col-span-full rounded-2xl border-2 border-dashed px-4 py-7 text-center text-[0.9375rem] leading-normal font-bold sm:py-10 sm:text-[1rem]"
      >
        {{ emptyText }}
      </li>
    </ul>
    <div v-else class="grid items-start gap-x-4.5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3" data-card-list>
      <div v-for="(col, ci) in columns" :key="ci" class="flex min-w-0 flex-col gap-6" data-column>
        <section
          v-for="g in col"
          :key="g.key"
          class="flex flex-col gap-2.5 sm:gap-3"
          :aria-labelledby="`group-${g.key}`"
          :data-group="g.key"
        >
          <div class="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h2
              :id="`group-${g.key}`"
              tabindex="-1"
              class="m-0 flex scroll-mt-4 items-center gap-2 text-[0.9375rem] leading-normal font-bold focus:outline-none sm:text-[1rem]"
              :class="g.key === 'overdue' && 'text-danger'"
            >
              <Icon v-if="g.key === 'overdue'" name="alert" :size="17" :stroke="2.6" />
              {{ g.label }}
              <span class="text-[0.8125rem] font-semibold" :class="g.key === 'overdue' ? 'text-danger' : 'text-muted'">
                {{ g.count }} งาน
              </span>
            </h2>
            <ClearDone v-if="g.key === 'done'" />
          </div>
          <ul class="m-0 flex list-none flex-col gap-3 p-0 pr-1 pb-1 sm:gap-4.5">
            <TodoCard v-for="t in g.items" :key="t.id" :todo="t" />
          </ul>
        </section>
      </div>
    </div>

    <!-- Thumb reach, above the iPhone home bar, lifted over the toast (its height is --toast-lift). -->
    <button
      v-if="fabShown"
      type="button"
      data-add-fab
      aria-label="เพิ่มงานใหม่"
      aria-haspopup="dialog"
      :aria-expanded="sheetOpen"
      class="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom)+var(--toast-lift,0px))] z-30 flex size-15 items-center justify-center rounded-full border-2 bg-accent p-0 text-ink shadow-brutal motion-safe:transition-[bottom,translate,box-shadow] motion-safe:duration-150 motion-safe:active:translate-0.75 motion-safe:active:shadow-none"
      @click="openSheet"
    >
      <Icon name="plus" :size="30" :stroke="3.5" />
    </button>
  </template>
  <AddSheet />
</template>
