<script setup lang="ts">
import { FILTERS, useListUi } from '../composables/useListUi'

const { filter, counts } = useListUi()
</script>

<template>
  <div class="relative -mx-5 sm:mx-0">
    <div
      role="group"
      aria-label="ตัวกรอง"
      class="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 py-0 pr-2 pl-3.5 text-[14px] font-semibold whitespace-nowrap sm:gap-2 sm:pl-4"
        :class="filter === f.key ? 'bg-ink text-white' : 'bg-white text-ink'"
        :aria-pressed="filter === f.key"
        @click="filter = f.key"
      >
        {{ f.label }}
        <span
          class="box-border flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold sm:px-1.75"
          :class="
            f.key === 'overdue' && counts.overdue > 0
              ? 'bg-danger text-white sm:bg-paper sm:text-ink'
              : filter === f.key
                ? 'bg-accent text-ink'
                : 'bg-paper text-ink'
          "
        >
          {{ counts[f.key] }}
        </span>
      </button>
    </div>
    <div
      aria-hidden="true"
      class="pointer-events-none absolute top-0 right-0 bottom-1 w-8 bg-linear-to-r from-paper/0 to-paper sm:hidden"
    ></div>
  </div>
</template>
