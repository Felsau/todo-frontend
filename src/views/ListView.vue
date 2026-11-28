<script setup lang="ts">
import AddBar from '../components/AddBar.vue'
import ClearDone from '../components/ClearDone.vue'
import EmptyIllustration from '../components/EmptyIllustration.vue'
import FilterBar from '../components/FilterBar.vue'
import ListSkeleton from '../components/ListSkeleton.vue'
import LoadError from '../components/LoadError.vue'
import SearchSort from '../components/SearchSort.vue'
import TodoCard from '../components/TodoCard.vue'
import { useListUi } from '../composables/useListUi'
import { useIsSm } from '../composables/useMedia'
import { useTodos } from '../composables/useTodos'

const { status, total } = useTodos()
const { groups, emptyText, searchOpen } = useListUi()
const isSm = useIsSm()

const grid =
  'm-0 grid list-none gap-3 p-0 pr-1 pb-1 sm:grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))] sm:gap-4.5 lg:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]'
</script>

<template>
  <ListSkeleton v-if="status === 'loading'" />
  <LoadError v-else-if="status === 'error'" />

  <template v-else>
    <SearchSort v-if="!isSm && searchOpen" compact />
    <AddBar />

    <div v-if="total > 0" class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3 max-sm:w-full">
        <FilterBar class="max-sm:w-full" />
        <ClearDone v-if="isSm" inline />
      </div>
      <SearchSort v-if="isSm" />
    </div>

    <ul v-if="total === 0" :class="grid">
      <li class="col-span-full flex flex-col items-center gap-4.5 px-4 py-6 text-center sm:py-10">
        <EmptyIllustration :scale="isSm ? 1 : 0.8" />
        <div>
          <div class="text-[1.125rem] leading-normal font-bold sm:text-[1.25rem]">ยังไม่มีงานเลย</div>
          <div class="text-[0.875rem] leading-normal font-medium text-muted sm:text-[0.9375rem]">
            พิมพ์งานแรกด้านบน แล้วกด “เพิ่ม +”
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
    <div v-else class="flex flex-col gap-5 sm:gap-6" data-card-list>
      <section
        v-for="g in groups"
        :key="g.key"
        class="flex flex-col gap-2.5 sm:gap-3"
        :aria-labelledby="g.label ? `group-${g.key}` : undefined"
        :data-group="g.key"
      >
        <h2
          v-if="g.label"
          :id="`group-${g.key}`"
          class="m-0 flex items-center gap-2 text-[0.9375rem] leading-normal font-bold sm:text-[1rem]"
          :class="g.key === 'overdue' && 'text-danger'"
        >
          {{ g.label }}
          <span
            class="box-border flex h-6 min-w-6 items-center justify-center rounded-full border-2 px-1.5 text-[0.75rem] font-semibold"
            :class="g.key === 'overdue' ? 'border-danger bg-danger text-white' : 'bg-white text-ink'"
          >
            {{ g.items.length }}
          </span>
        </h2>
        <ul :class="grid">
          <TodoCard v-for="t in g.items" :key="t.id" :todo="t" />
        </ul>
      </section>
    </div>

    <ClearDone v-if="!isSm" />
  </template>
</template>
