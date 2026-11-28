<script setup lang="ts">
import { nextTick, useId } from 'vue'
import { SORTS, useListUi } from '../composables/useListUi'
import type { SortKey } from '../types'
import Icon from './Icon.vue'

/*
 * Sort menu and search. From 640px both sit at the right of the filter row.
 * On phones the sort menu is always on screen, so the chosen order can be seen, and the
 * search button next to it opens only the search box (QA round 4, P12, U5).
 */
defineProps<{ phone?: boolean }>()
const { query, sort, searchOpen, toggleSearch } = useListUi()
const searchId = useId()
const sortId = useId()

/** Opening search on a phone puts the cursor straight in the box (R2-16). */
async function onSearchToggle() {
  toggleSearch()
  if (!searchOpen.value) return
  await nextTick()
  document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
}

const field = 'box-border h-11 w-full rounded-full border-2 bg-white text-[1rem] font-semibold sm:text-[0.875rem]'
</script>

<template>
  <div v-if="phone" class="flex flex-col gap-2" data-list-tools>
    <div class="flex items-center gap-2">
      <label :for="sortId" class="label">เรียง</label>
      <div class="relative min-w-0 flex-1">
        <select
          :id="sortId"
          :value="sort"
          :class="[field, 'appearance-none pr-9 pl-3.5']"
          @change="sort = ($event.target as HTMLSelectElement).value as SortKey"
        >
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <Icon name="chevronDown" :size="14" :stroke="3" class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
      </div>
      <button
        type="button"
        class="btn-pill flex-none gap-1.5 pl-3 max-[22.5rem]:w-11 max-[22.5rem]:px-0"
        :class="searchOpen && 'bg-accent'"
        :aria-pressed="searchOpen"
        aria-label="ค้นหา"
        @click="onSearchToggle"
      >
        <Icon name="search" :size="18" />
        <span class="max-[22.5rem]:sr-only">ค้นหา</span>
      </button>
    </div>
    <div v-if="searchOpen" class="relative">
      <label :for="searchId" class="sr-only">ค้นหาชื่องานหรือโน้ต</label>
      <Icon name="search" :size="18" class="pointer-events-none absolute top-3 left-3.25" />
      <input
        :id="searchId"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="ค้นหาชื่องานหรือโน้ต"
        data-search-input
        :class="[field, 'pr-3.5 pl-10']"
      />
    </div>
  </div>

  <div v-else class="flex flex-wrap items-center gap-2.5">
    <div class="relative w-56">
      <label :for="searchId" class="sr-only">ค้นหาชื่องานหรือโน้ต</label>
      <Icon name="search" :size="18" class="pointer-events-none absolute top-3 left-3.25" />
      <input
        :id="searchId"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="ค้นหาชื่องานหรือโน้ต"
        data-search-input
        :class="[field, 'pr-3.5 pl-10']"
      />
    </div>
    <div class="flex items-center gap-2">
      <label :for="sortId" class="label">เรียง</label>
      <div class="relative min-w-37.5">
        <select
          :id="sortId"
          :value="sort"
          :class="[field, 'appearance-none pr-9 pl-3.5']"
          @change="sort = ($event.target as HTMLSelectElement).value as SortKey"
        >
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <Icon name="chevronDown" :size="14" :stroke="3" class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
      </div>
    </div>
  </div>
</template>
