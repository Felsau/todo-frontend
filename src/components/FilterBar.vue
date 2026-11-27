<script setup lang="ts">
import { FILTERS, useListUi } from '../composables/useListUi'

const { filter, counts } = useListUi()
</script>

<template>
  <div>
    <div
      role="group"
      aria-label="ตัวกรอง"
      class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
    >
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="flex h-11 shrink-0 items-center justify-between gap-1.5 rounded-full sm:justify-start border-2 py-0 pr-2 pl-3.5 text-[14px] font-semibold whitespace-nowrap sm:gap-2 sm:pl-4"
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
  </div>
</template>
