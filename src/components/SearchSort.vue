<script setup lang="ts">
import { useId } from 'vue'
import { SORTS, useListUi } from '../composables/useListUi'
import type { SortKey } from '../types'
import Icon from './Icon.vue'

/* Search box and sort menu. Always visible from 640px, behind the search icon below that. */
defineProps<{ compact?: boolean }>()
const { query, sort } = useListUi()
const searchId = useId()
const sortId = useId()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" :class="compact && 'flex-col items-stretch gap-2'">
    <div class="relative" :class="compact ? 'w-full' : 'w-60'">
      <label :for="searchId" class="sr-only">ค้นหารายการ</label>
      <Icon name="search" :size="18" class="pointer-events-none absolute top-3 left-3.25" />
      <input
        :id="searchId"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="ค้นหา..."
        data-search-input
        class="box-border h-11 w-full rounded-full border-2 bg-white pr-3.5 pl-10 text-[16px] font-semibold sm:text-[14px]"
      />
    </div>
    <div class="flex items-center gap-2">
      <label :for="sortId" class="label">เรียง</label>
      <div class="relative" :class="compact ? 'min-w-0 flex-1' : 'min-w-37.5'">
        <select
          :id="sortId"
          :value="sort"
          class="box-border h-11 w-full appearance-none rounded-full border-2 bg-white pr-9 pl-3.5 text-[16px] font-semibold sm:text-[14px]"
          @change="sort = ($event.target as HTMLSelectElement).value as SortKey"
        >
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <Icon
          name="chevronDown"
          :size="14"
          :stroke="3"
          class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
        />
      </div>
    </div>
  </div>
</template>
